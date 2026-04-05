export const paramsSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer', minimum: 1 },
    },
    required: ['id'],
    additionalProperties: false,
};
