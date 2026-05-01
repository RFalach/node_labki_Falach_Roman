import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyEnv from '@fastify/env';
import envSchema from './schemas/env.schema.js';
import sensible from '@fastify/sensible';
import productRoutes from './routes/productRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { createBackup } from './utils/backup.utils.js';
import { checkSchema } from './utils/schemaCheck.utils.js';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

import fastifyRateLimit from '@fastify/rate-limit';
import productRoutesV2 from './routes/productRoutesV2.js';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import fastifyWebsocket from '@fastify/websocket';
import { eventBus } from './utils/eventBus.utils.js';
import { findAll } from './repositories/item.repository.js';

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

await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
        return {
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil((context.ttl) / 1000)} seconds.`
        };
    }
});

await fastify.register(fastifyMultipart, {
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
});

await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
});

await fastify.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Inventory API',
            description: 'API для магазину техніки (Варіант 1)',
            version: '1.0.0',
        },
        servers: [
            {
                url: `http://localhost:${fastify.config.PORT || 5000}`,
                description: 'Development server',
            },
        ],
        tags: [
            { name: 'products', description: 'Products endpoints' },
        ],
    },
});

await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
    },
});

await fastify.register(fastifyWebsocket);

fastify.get('/ws', { websocket: true }, (socket, request) => {
    console.log('WebSocket client connected');

    findAll().then(products => {
        socket.send(JSON.stringify({
            event: 'connected',
            data: products
        }));
    });

    const onCreated = (data) => {
        socket.send(JSON.stringify({ event: 'created', data }));
    };
    const onUpdated = (data) => {
        socket.send(JSON.stringify({ event: 'updated', data }));
    };
    const onDeleted = (id) => {
        socket.send(JSON.stringify({ event: 'deleted', id }));
    };

    eventBus.on('created', onCreated);
    eventBus.on('updated', onUpdated);
    eventBus.on('deleted', onDeleted);

    socket.on('close', () => {
        eventBus.off('created', onCreated);
        eventBus.off('updated', onUpdated);
        eventBus.off('deleted', onDeleted);
        console.log('WebSocket client disconnected');
    });
});

fastify.register(productRoutes, { prefix: '/api/v1' });
fastify.register(productRoutesV2, { prefix: '/api/v2' });
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
    await createBackup();
    await checkSchema(fastify);

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
