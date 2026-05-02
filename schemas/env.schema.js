export default {
    type: 'object',
    required: ['PORT', 'HOSTNAME', 'NODE_ENV', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_DB'],
    properties: {
        PORT: {
            type: 'number',
            default: 3000,
        },
        HOSTNAME: {
            type: 'string',
            default: 'localhost',
        },
        NODE_ENV: {
            type: 'string',
            enum: ['development', 'production'],
            default: 'development',
        },
        ADMIN_API_KEY: { type: 'string' },
	USD_TO_UAH: { type: 'number', default: 43.9 },

	MYSQL_HOST: { type: 'string', default: 'localhost' },
	MYSQL_PORT: { type: 'number', default: 3306 },
	MYSQL_USER: { type: 'string', default: 'root' },
	MYSQL_PASSWORD: { type: 'string', default: '' },
	MYSQL_DB: { type: 'string', default: 'inventory' },
    },
};
