import INVENTORY from '../data/inventory.js';
import {
    PRODUCT_NOT_FOUND,
    INVALID_PARAMS,
    INVALID_BODY,
} from '../constants/errors.js';

export async function getProducts(request, reply) {
    const minPriceParam = request.query.minPrice;
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : 0;

    let results = [...INVENTORY];
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

    const lastId = INVENTORY.length ? INVENTORY[INVENTORY.length - 1].id : 0;
    const productToSave = { id: lastId + 1, ...data };
    INVENTORY.push(productToSave);

    return reply.code(201).send({
        message: 'Product added',
        product: productToSave,
    });
}

export async function patchProduct(request, reply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
        return reply.badRequest({ error: INVALID_PARAMS });
    }

    const index = INVENTORY.findIndex((p) => p.id === id);
    if (index === -1) {
        return reply.notFound({ error: PRODUCT_NOT_FOUND });
    }

    const updates = request.body;
    if (!updates || typeof updates !== 'object') {
        return reply.badRequest({ error: INVALID_BODY });
    }

    INVENTORY[index] = { ...INVENTORY[index], ...updates };

    return reply.code(200).send({
        message: 'Updated',
        product: INVENTORY[index],
    });
}

export async function deleteProduct(request, reply) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
        return reply.badRequest({ error: INVALID_PARAMS });
    }

    const index = INVENTORY.findIndex((p) => p.id === id);
    if (index === -1) {
        return reply.notFound({ error: PRODUCT_NOT_FOUND });
    }

    INVENTORY.splice(index, 1);

    return reply.code(200).send({ message: 'Deleted' });
}
