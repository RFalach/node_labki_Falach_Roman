import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';

import fastifyEnv from '@fastify/env';
import envSchema from './schemas/env.schema.js';

import sensible from '@fastify/sensible';

import productRoutes from './routes/productRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const isDev = process.env.NODE_ENV === 'development';

const fastify = Fastify({
    logger: isDev
        ? {
              level: 'info',
              transport: {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                  },
              },
          }
        : true,
});

await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
});

await fastify.register(fastifyHelmet, { global: true });

await fastify.register(fastifyCors, {
    origin:
        fastify.config.NODE_ENV === 'development'
            ? '*'
            : 'https://myproductiondomain.com',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});

await fastify.register(sensible);

fastify.register(productRoutes);
fastify.register(healthRoutes);

fastify.addHook('onClose', async (instance, done) => {
    instance.log.info('Server is closing...');
    done();
});

fastify.setErrorHandler((error, request, reply) => {
    request.log.error({
        msg: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
    });

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
        error: error.message || 'Internal Server Error',
    });
});

fastify.addHook('onResponse', (request, reply, done) => {
    const level = reply.statusCode >= 400 ? 'error' : 'info';
    if (fastify.config.NODE_ENV === 'development' || level === 'error') {
        request.log[level]({
            method: request.method,
            url: request.url,
            status: reply.statusCode,
        });
    }
    done();
});

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    try {
        await fastify.close();
        console.log('Server closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }

    setTimeout(() => {
        console.error('Force shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (err) => {
    fastify.log.error({ msg: 'uncaughtException', error: err });
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
    fastify.log.error({ msg: 'unhandledRejection', error: err });
    gracefulShutdown('unhandledRejection');
});

const start = async () => {
    try {
        await fastify.listen({
            port: fastify.config.PORT,
            host: fastify.config.HOSTNAME,
        });

        console.log(
            `Server running at http://${fastify.config.HOSTNAME}:${fastify.config.PORT}/`
        );
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
