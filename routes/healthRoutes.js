export default async function healthRoutes(fastify) {
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok' };
    });

    fastify.get(
        '/health/details',
        {
            onRequest: (request, reply, done) => {
                const apiKey = request.headers['x-api-key'];
                if (apiKey !== fastify.config.ADMIN_API_KEY) {
                    return reply.code(401).send({ error: 'Unauthorized' });
                }
                done();
            },
        },
        async (request, reply) => {
            return {
                pid: process.pid,
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
            };
        }
    );
}
