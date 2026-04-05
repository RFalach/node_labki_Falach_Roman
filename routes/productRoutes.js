import {
    getProducts,
    postProduct,
    patchProduct,
    deleteProduct,
} from '../controllers/productController.js';

import { productSchema } from '../schemas/productSchema.js';
import { patchProductSchema } from '../schemas/patchProductSchema.js';
import { paramsSchema } from '../schemas/paramsSchema.js';

export default async function productRoutes(fastify) {
    // GET /products
    fastify.get(
        '/products',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        minPrice: { type: 'number', minimum: 0 },
                    },
                    additionalProperties: false,
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            count: { type: 'integer' },
                            items: { type: 'array', items: productSchema },
                        },
                    },
                },
            },
        },
        getProducts
    );

    // POST /products
    fastify.post(
        '/products',
        {
            schema: {
                body: productSchema,
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            product: productSchema,
                        },
                    },
                },
            },
        },
        postProduct
    );

    // PATCH /products/id
    fastify.patch(
        '/products/:id',
        {
            schema: {
                params: paramsSchema,
                body: patchProductSchema,
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            product: patchProductSchema,
                        },
                    },
                },
            },
        },
        patchProduct
    );

    // DELETE /products/id
    fastify.delete(
        '/products/:id',
        {
            schema: {
                params: paramsSchema,
                response: {
                    200: {
                        type: 'object',
                        properties: { message: { type: 'string' } },
                    },
                },
            },
        },
        deleteProduct
    );
}
