export default {
    type: 'object',
    required: ['PORT', 'HOSTNAME', 'NODE_ENV'],
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
    },
};
