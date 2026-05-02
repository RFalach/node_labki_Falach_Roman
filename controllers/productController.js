import {
    findAll,
    findById,
    create,
    update,
    remove,
} from '../repositories/item.repository.js';

import {
    PRODUCT_NOT_FOUND,
    INVALID_PARAMS,
    INVALID_BODY,
} from '../constants/errors.js';

import { getFullImageUrl } from '../utils/image.utils.js';

import { eventBus } from '../utils/eventBus.utils.js';

export async function getProducts(request, reply) {
    const minPriceParam = request.query.minPrice;
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : 0;

    let results = await findAll();

    results = results.map((product) => ({
        ...product,
        image: getFullImageUrl(request, product.image),
    }));

    if (!isNaN(minPrice) && minPrice > 0) {
        results = results.filter((p) => p.price >= minPrice);
    }

    return reply.code(200).send({
        count: results.length,
        items: results,
    });
}

export async function postProduct(request, reply) {
    const data = request.body;

    if (!data || typeof data !== 'object') {
        return reply.badRequest({ error: INVALID_BODY });
    }

    const product = await create(data);

    eventBus.emit('created', product);

    return reply.code(201).send({
        message: 'Product added',
        product: {
            ...product,
            image: getFullImageUrl(request, product.image),
        },
    });
}

export async function patchProduct(request, reply) {
    const id = request.params.id;
    if (!id) {
        return reply.badRequest({ error: INVALID_PARAMS });
    }

    const updates = request.body;
    if (!updates || typeof updates !== 'object') {
        return reply.badRequest({ error: INVALID_BODY });
    }

    const updated = await update(id, updates);

    if (!updated) {
        return reply.notFound({ error: PRODUCT_NOT_FOUND });
    }

    eventBus.emit('updated', updated);

    return reply.code(200).send({
        message: 'Updated',
        product: {
            ...updated,
            image: getFullImageUrl(request, updated.image),
        },
    });
}

export async function deleteProduct(request, reply) {
    const id = request.params.id;
    if (!id) {
        return reply.badRequest({ error: INVALID_PARAMS });
    }

    const success = await remove(id);

    if (!success) {
        return reply.notFound({ error: PRODUCT_NOT_FOUND });
    }

    eventBus.emit('deleted', id);

    return reply.code(200).send({ message: 'Deleted' });
}
