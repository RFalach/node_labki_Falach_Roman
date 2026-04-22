import {
    getProducts,
    postProduct,
    patchProduct,
    deleteProduct,
} from '../controllers/productController.js';

import { productSchema } from '../schemas/productSchema.js';
import { patchProductSchema } from '../schemas/patchProductSchema.js';
import { paramsSchema } from '../schemas/paramsSchema.js';

import {
    findAll,
    findById,
    create,
    update,
    remove,
} from '../repositories/item.repository.js';

import { stringify } from 'csv-stringify';

import fs from 'fs/promises';
import path from 'path';
import { processImportedFile } from '../utils/import.utils.js';

import { saveImage, getFullImageUrl } from '../utils/image.utils.js';

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

    // GET /products/export
    fastify.get('/products/export', async (request, reply) => {
        try {
            const products = await findAll();

            request.log.info(`Found ${products.length} products for export`);

            const csvData = products.map((product) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                qty: product.qty,
                category: product.category || '',
                image: getFullImageUrl(request, product.image),
            }));

            const csvString = await new Promise((resolve, reject) => {
                stringify(
                    csvData,
                    {
                        header: true,
                        columns: [
                            'id',
                            'name',
                            'price',
                            'qty',
                            'category',
                            'image',
                        ],
                    },
                    (err, output) => {
                        if (err) {
                            request.log.error('CSV stringify error:', err);
                            reject(err);
                        } else {
                            resolve(output);
                        }
                    }
                );
            });

            reply
                .header('Content-Type', 'text/csv')
                .header(
                    'Content-Disposition',
                    'attachment; filename="products.csv"'
                )
                .send(csvString);
        } catch (error) {
            request.log.error('Export error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
            });
            reply.internalServerError(
                'Failed to export products: ' + error.message
            );
        }
    });

    // POST /products/import
    fastify.post('/products/import', async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.badRequest('No file uploaded');
            }

            const filename = data.filename;
            let fileType;

            if (filename.endsWith('.csv')) {
                fileType = 'csv';
            } else if (filename.endsWith('.json')) {
                fileType = 'json';
            } else {
                return reply.badRequest(
                    'Only CSV and JSON files are supported'
                );
            }

            const tempDir = path.join(process.cwd(), 'data', 'temp');
            await fs.mkdir(tempDir, { recursive: true });

            const tempFilePath = path.join(
                tempDir,
                `${Date.now()}-${filename}`
            );
            await fs.writeFile(tempFilePath, await data.toBuffer());

            const result = await processImportedFile(tempFilePath, fileType);

            await fs.unlink(tempFilePath).catch(() => {});

            if (result.errors.length > 0) {
                request.log.warn({
                    msg: 'Import completed with errors',
                    imported: result.imported,
                    rejected: result.rejected,
                    errors: result.errors,
                });
            }

            reply.send({
                message: 'Import completed',
                imported: result.imported,
                rejected: result.rejected,
                errors: result.errors,
            });
        } catch (error) {
            request.log.error('Import error:', error);
            reply.internalServerError(
                'Failed to import file: ' + error.message
            );
        }
    });

    // POST /products/:id/image
    fastify.post(
        '/products/:id/image',
        {
            config: {
                consumes: ['multipart/form-data'],
            },
        },
        async (request, reply) => {
            try {
                const { id } = request.params;

                const product = await findById(Number(id));
                if (!product) {
                    return reply.notFound(`Product with id ${id} not found`);
                }

                const data = await request.file();

                if (!data) {
                    return reply.badRequest('No file uploaded');
                }

                const imagePath = await saveImage(id, data);

                const updatedProduct = await update(Number(id), {
                    image: imagePath,
                });

                const fullImageUrl = getFullImageUrl(
                    request,
                    updatedProduct.image
                );

                reply.send({
                    message: 'Image uploaded successfully',
                    product: {
                        ...updatedProduct,
                        image: fullImageUrl,
                    },
                });
            } catch (error) {
                request.log.error('Image upload error:', error);

                if (error.message.includes('Invalid file type')) {
                    return reply.badRequest(error.message);
                }
                if (error.message.includes('File size exceeds')) {
                    return reply.badRequest(error.message);
                }

                reply.internalServerError(
                    'Failed to upload image: ' + error.message
                );
            }
        }
    );
}
