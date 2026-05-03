import {
    getProducts,
    postProduct,
    patchProduct,
    deleteProduct,
} from '../controllers/productController.js';

import { productSchema } from '../schemas/productSchema.js';
import { patchProductSchema } from '../schemas/patchProductSchema.js';
import { paramsSchema } from '../schemas/paramsSchema.js';

import { initRepository, findAll, findById, create, update, remove } from '../repositories/item.repository.js';

import { Readable } from 'stream';
import { stringify } from 'csv-stringify';

import fs from 'fs/promises';
import path from 'path';
import { processImportedFile } from '../utils/import.utils.js';

import { saveImage, getFullImageUrl } from '../utils/image.utils.js';

import { fetchExternalData } from '../utils/apiClient.utils.js';

import fsSync from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';

import { initApiClient } from '../utils/apiClient.utils.js';

import { REDIS_KEYS } from '../constants/redisKeys.js';

const productResponse = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        qty: { type: 'integer' },
        category: { type: 'string' },
        image: { type: ['string', 'null'] },
    },
};

export default async function productRoutes(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
	if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
            if (!request.session.user) {
		return reply.unauthorized('Authentication required');
            }
	}
    });
    
    initApiClient(fastify.redis);

    fastify.addHook('onResponse', async (request, reply) => {
	const method = request.method;
	if (['POST', 'PATCH', 'DELETE'].includes(method) && 
            request.url.includes('/api/v1/products') &&
            reply.statusCode < 400) {
            
            const keys = await fastify.redis.keys(`${REDIS_KEYS.PRODUCTS_LIST}*`);
            if (keys.length > 0) {
		await fastify.redis.del(keys);
		fastify.log.info('Cache invalidated after data change');
            }
	}
    });

    // GET /products
    fastify.get(
        '/products',
        {
            schema: {
                tags: ['products'],
                summary: 'Get all products',
                description: 'Returns list of all products with optional minPrice filter',
                querystring: {
                    type: 'object',
                    properties: {
                        minPrice: { type: 'number', minimum: 0, description: 'Minimum price filter' },
                    },
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            count: { type: 'integer' },
                            items: { type: 'array', items: productResponse },
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
                tags: ['products'],
                summary: 'Create new product',
                description: 'Creates a new product and returns it',
                body: productSchema,
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            product: productResponse,
                        },
                    },
                },
            },
        },
        postProduct
    );

    // PATCH /products/:id
    fastify.patch(
        '/products/:id',
        {
            schema: {
                tags: ['products'],
                summary: 'Update product',
                description: 'Updates product by ID',
                params: paramsSchema,
                body: patchProductSchema,
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            product: productResponse,
                        },
                    },
                },
            },
        },
        patchProduct
    );

    // DELETE /products/:id
    fastify.delete(
        '/products/:id',
        {
            schema: {
                tags: ['products'],
                summary: 'Delete product',
                description: 'Deletes product by ID',
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
    fastify.get('/products/export', {
	schema: {
            tags: ['products'],
            summary: 'Export products to CSV',
            description: 'Returns all products as CSV file. Use ?transform=true to convert USD to UAH',
            querystring: {
		type: 'object',
		properties: {
                    transform: { type: 'boolean', default: false }
		}
            },
            response: {
		200: {
                    type: 'string',
                    format: 'binary',
		},
            },
	},
    }, async (request, reply) => {
	try {
            const shouldTransform = request.query.transform === true;
            const rate = fastify.config.USD_TO_UAH || 41.5;
            
            const products = await findAll();
            
            let processedProducts = products;
            
            if (shouldTransform) {
		processedProducts = products.map(p => ({
                    ...p,
                    price: p.price * rate
		}));
            }

            const csvData = processedProducts.map((product) => ({
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
			columns: ['id', 'name', 'price', 'qty', 'category', 'image'],
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
		.header('Content-Disposition', 'attachment; filename="products.csv"')
		.send(csvString);
	} catch (error) {
            request.log.error('Export error details:', {
		message: error.message,
		stack: error.stack,
            });
            reply.internalServerError('Failed to export products: ' + error.message);
	}
    });
    
    // POST /products/import
    fastify.post('/products/import', {
        schema: {
            tags: ['products'],
            summary: 'Import products from file',
            description: 'Accepts CSV or JSON file and imports products',
            consumes: ['multipart/form-data'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        imported: { type: 'integer' },
                        rejected: { type: 'integer' },
                        errors: { type: 'array' },
                    },
                },
            },
        },
    }, async (request, reply) => {
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
            schema: {
                tags: ['products'],
                summary: 'Upload product image',
                description: 'Uploads image for product (JPEG/PNG, max 5MB)',
                params: paramsSchema,
                consumes: ['multipart/form-data'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            product: productResponse,
                        },
                    },
                },
            },
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

    // GET /products/:id/details
    fastify.get('/products/:id/details', {
	schema: {
            tags: ['products'],
            summary: 'Get product with external details',
            description: 'Returns product combined with category data from external service',
            params: paramsSchema,
	},
    }, async (request, reply) => {
	const id = parseInt(request.params.id, 10);
	
	const product = await findById(id);
	
	if (!product) {
            return reply.notFound(`Product with id ${id} not found`);
	}
	
	const productWithImage = {
            ...product,
            image: getFullImageUrl(request, product.image)
	};
	
	try {
            const externalData = await fetchExternalData('http://localhost:3001/categories');
            
            if (externalData && Array.isArray(externalData)) {
		const category = externalData.find(
                    c => c.name.toLowerCase() === (productWithImage.category || '').toLowerCase()
		);
		
		if (category) {
                    return reply.send({
			...productWithImage,
			categoryDetails: {
                            id: category.id,
                            name: category.name,
                            tax: category.tax
			}
                    });
		}
            }
            
            return reply.send({
		...productWithImage,
		categoryDetails: null
            });
            
	} catch (error) {
            request.log.warn('Failed to fetch external data:', error.message);
            
            return reply.send({
		...productWithImage,
		categoryDetails: null
            });
	}
    });

    // GET /products/stream
    fastify.get('/products/stream', {
	schema: {
            tags: ['products'],
            summary: 'Stream products as NDJSON',
            description: 'Streams products one by one in application/x-ndjson format',
	},
    }, async (request, reply) => {
	const products = await findAll();
	
	reply.type('application/x-ndjson');
	
	const stream = Readable.from(
            (async function* () {
		for (const product of products) {
                    const productWithUrl = {
			...product,
			image: getFullImageUrl(request, product.image)
                    };
                    yield JSON.stringify(productWithUrl) + '\n';
		}
            })()
	);
	
	return reply.send(stream);
    });

    // GET /backups/:timestamp
    fastify.get('/backups/:timestamp', {
	schema: {
            tags: ['backups'],
            summary: 'Download backup file',
            description: 'Returns backup .gz file. Protected by API key in header.',
            params: {
		type: 'object',
		required: ['timestamp'],
		properties: {
                    timestamp: { type: 'string' }
		}
            },
            headers: {
		type: 'object',
		properties: {
                    'x-api-key': { type: 'string' }
		}
            }
	}
    }, async (request, reply) => {
	const apiKey = request.headers['x-api-key'];
	
	if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
            return reply.status(401).send({ error: 'Unauthorized: Invalid API key' });
	}
	
	const { timestamp } = request.params;
	const backupPath = path.join(process.cwd(), 'data', 'backups', `${timestamp}.gz`);
	
	if (!fsSync.existsSync(backupPath)) {
            return reply.notFound(`Backup ${timestamp} not found`);
	}
	
	reply
            .header('Content-Type', 'application/gzip')
            .header('Content-Disposition', `attachment; filename="${timestamp}.gz"`);
	
	return reply.send(fsSync.createReadStream(backupPath));
    });
    
}

