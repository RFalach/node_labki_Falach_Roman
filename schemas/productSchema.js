export const productSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        price: { type: 'number', minimum: 0 },
        qty: { type: 'integer', minimum: 0 },
        category: { type: 'string' },
        image: { type: ['string', 'null'] },
    },
    required: ['name', 'price', 'qty'],
    additionalProperties: false,
};
