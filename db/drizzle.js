import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

async function drizzlePlugin(fastify) {
    const pool = mysql.createPool({
        host: fastify.config.MYSQL_HOST,
        port: fastify.config.MYSQL_PORT,
        user: fastify.config.MYSQL_USER,
        password: fastify.config.MYSQL_PASSWORD,
        database: fastify.config.MYSQL_DB,
        socketPath: '/run/mysqld/mysqld.sock',
        waitForConnections: true,
        connectionLimit: 10,
    });

    const db = drizzle(pool);

    try {
        await pool.query('SELECT 1');
        fastify.log.info('Drizzle/MySQL connected');
    } catch (err) {
        fastify.log.error('Drizzle connection error:', err.message);
        process.exit(1);
    }

    fastify.decorate('db', db);

    fastify.addHook('onClose', async () => {
        await pool.end();
        fastify.log.info('MySQL pool closed');
    });
}

export default fp(drizzlePlugin, { name: 'drizzle' });
