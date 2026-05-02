export default {
    schema: './db/schema.js',
    out: './db/migrations',
    dialect: 'mysql',
    dbCredentials: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DB || 'inventory',
    },
};
