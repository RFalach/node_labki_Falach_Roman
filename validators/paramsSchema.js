const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const paramsSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', minimum: 1 },
    },
    required: ['id'],
    additionalProperties: false,
};

const validateParams = ajv.compile(paramsSchema);
module.exports = validateParams;
