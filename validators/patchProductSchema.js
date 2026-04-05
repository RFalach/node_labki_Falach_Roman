import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const patchProductSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        price: { type: 'number', minimum: 0 },
        qty: { type: 'integer', minimum: 0 },
    },
    additionalProperties: false,
};

const validatePatchProduct = ajv.compile(patchProductSchema);

export default validatePatchProduct;
