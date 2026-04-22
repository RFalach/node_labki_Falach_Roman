import Ajv from 'ajv';
import { productSchema } from '../schemas/productSchema.js';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(productSchema);

export function validateProduct(data) {
    const { id, ...productData } = data;

    const valid = validate(productData);

    if (!valid) {
        return {
            valid: false,
            errors: validate.errors.map(
                (err) => `${err.instancePath} ${err.message}`
            ),
        };
    }

    return {
        valid: true,
        data: productData,
    };
}
