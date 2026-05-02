import fp from 'fastify-plugin';
import mongoose from 'mongoose';

async function mongoPlugin(fastify) {
    const url = `${fastify.config.MONGO_URL}/${fastify.config.MONGO_DB_NAME}`;
    
    try {
        await mongoose.connect(url);
        fastify.log.info('MongoDB connected');
    } catch (err) {
        fastify.log.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
    
    fastify.decorate('db', mongoose);
    
    fastify.addHook('onClose', async () => {
        await mongoose.disconnect();
        fastify.log.info('MongoDB disconnected');
    });
}

export default fp(mongoPlugin, { name: 'mongo' });
