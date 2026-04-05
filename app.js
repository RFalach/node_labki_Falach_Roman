const { createServer } = require('node:http');
const { URL } = require('url');
const config = require('./config');
const log = require('./utils/logger');
const handleProductRoutes = require('./routes/productRoutes');

let isShuttingDown = false;

function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    server.close(() => {
        console.log('Server closed successfully');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Force shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (err) => {
    log({ level: 'ERROR', message: err.message });
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
    log({ level: 'ERROR', message: err?.message || 'Unhandled rejection' });
    gracefulShutdown('unhandledRejection');
});

const server = createServer((req, res) => {
    res.on('finish', () => {
        const { method, url } = req;
        const { statusCode } = res;
        const level = statusCode >= 400 ? 'ERROR' : 'INFO';

        if (config.NODE_ENV === 'development' || level === 'ERROR') {
            log({ level, method, url, status: statusCode });
        }
    });

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;
    let body = '';

    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () =>
        handleProductRoutes(req, res, parsedUrl, method, pathname, body)
    );
});

server.listen(config.PORT, config.HOSTNAME, () => {
    console.log(`Server running at http://${config.HOSTNAME}:${config.PORT}/`);
});
