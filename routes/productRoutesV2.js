import { findAll } from '../repositories/item.repository.js';
import { getFullImageUrl } from '../utils/image.utils.js';

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

export default async function productRoutesV2(fastify) {
    fastify.get('/products', {
        schema: {
            tags: ['products'],
            summary: 'Get products with pagination (v2)',
            description: 'Returns paginated list of products',
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'integer', minimum: 1, default: 1, description: 'Page number' },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10, description: 'Items per page' },
                    minPrice: { type: 'number', minimum: 0, description: 'Minimum price filter' }
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: productResponse },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'integer' },
                                page: { type: 'integer' },
                                limit: { type: 'integer' },
                                totalPages: { type: 'integer' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
	const page = request.query.page || 1;
        const limit = request.query.limit || 10;
        const minPrice = request.query.minPrice;

        let results = await findAll();

        if (minPrice !== undefined && minPrice > 0) {
            results = results.filter(p => p.price >= minPrice);
        }

        results = results.map(product => ({
            ...product,
            image: getFullImageUrl(request, product.image)
        }));

        const total = results.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = results.slice(startIndex, endIndex);

        return reply.code(200).send({
            data: paginatedItems,
            meta: {
                total,
                page,
                limit,
                totalPages
            }
        });
    });
}
