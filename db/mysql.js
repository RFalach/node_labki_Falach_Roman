import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function mysqlPlugin(fastify) {
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

    try {
        const conn = await pool.getConnection();
        fastify.log.info('MySQL connected');
        
        const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
	
	const queries = schema
	      .split(';')
	      .map(q => q.trim())
	      .filter(q => q.length > 0);

	for (const query of queries) {
	    await conn.query(query);
	}
	
        conn.release();
    } catch (err) {
	fastify.log.error('MySQL connection error: ' + err.code);
	fastify.log.error('Details: ' + err.message);
	fastify.log.error('SQL State: ' + err.sqlState);
	process.exit(1);
    }

    fastify.decorate('db', pool);

    fastify.addHook('onClose', async () => {
        await pool.end();
        fastify.log.info('MySQL pool closed');
    });
}

export default fp(mysqlPlugin, { name: 'mysql' });
