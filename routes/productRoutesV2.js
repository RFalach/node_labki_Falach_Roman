import { findAll, initRepository } from '../repositories/item.repository.js';
import { getFullImageUrl } from '../utils/image.utils.js';
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

export default async function productRoutesV2(fastify) {
    initRepository(fastify.db);

    fastify.get('/products', {
        schema: {
            tags: ['products'],
            summary: 'Get products with pagination (v2)',
            description: 'Returns paginated list of products',
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'integer', minimum: 1, default: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                    minPrice: { type: 'number', minimum: 0 }
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

        const cacheKey = `${REDIS_KEYS.PRODUCTS_LIST}:page=${page}&limit=${limit}&minPrice=${minPrice || 0}`;
        
        const cached = await fastify.redis.get(cacheKey);
        if (cached) {
            return reply.code(200).send(JSON.parse(cached));
        }

        let results = await findAll();

        if (minPrice !== undefined && minPrice > 0) {
            results = results.filter(p => Number(p.price) >= minPrice);
        }

        results = results.map(product => ({
            ...product,
            image: getFullImageUrl(request, product.image)
        }));

        const total = results.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedItems = results.slice(startIndex, startIndex + limit);

        const response = {
            data: paginatedItems,
            meta: { total, page, limit, totalPages }
        };

        await fastify.redis.setex(cacheKey, 86400, JSON.stringify(response));

        return reply.code(200).send(response);
    });
}
