const INVENTORY = require('../data/inventory');
const validateProduct = require('../validators/productSchema');
const validatePatchProduct = require('../validators/patchProductSchema');
const validateParams = require('../validators/paramsSchema');

function getProducts(res, parsedUrl) {
    const minPriceParam = parsedUrl.searchParams.get('minPrice');
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : 0;

    let results = [...INVENTORY];
    if (!isNaN(minPrice) && minPrice > 0) {
        results = results.filter((p) => p.price >= minPrice);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ count: results.length, items: results }, null, 4));
}

function postProduct(res, body) {
    try {
        const data = JSON.parse(body);
        if (!validateProduct(data)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ errors: validateProduct.errors }));
        }

        const lastId = INVENTORY.length
            ? INVENTORY[INVENTORY.length - 1].id
            : 0;
        const productToSave = { id: lastId + 1, ...data };
        INVENTORY.push(productToSave);

        res.statusCode = 201;
        res.end(
            JSON.stringify({ message: 'Product added', product: productToSave })
        );
    } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
}

function patchProduct(res, id, body) {
    if (!validateParams({ id })) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ errors: validateParams.errors }));
    }

    const index = INVENTORY.findIndex((p) => p.id === id);
    if (index === -1) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Not Found' }));
    }

    try {
        const updates = JSON.parse(body);
        if (!validatePatchProduct(updates)) {
            res.statusCode = 400;
            return res.end(
                JSON.stringify({ errors: validatePatchProduct.errors })
            );
        }

        INVENTORY[index] = { ...INVENTORY[index], ...updates };
        res.statusCode = 200;
        res.end(
            JSON.stringify({ message: 'Updated', product: INVENTORY[index] })
        );
    } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
}

function deleteProduct(res, id) {
    if (!validateParams({ id })) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ errors: validateParams.errors }));
    }

    const originalLength = INVENTORY.length;
    INVENTORY = INVENTORY.filter((p) => p.id !== id);

    if (INVENTORY.length < originalLength) {
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Deleted' }));
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
}

module.exports = { getProducts, postProduct, patchProduct, deleteProduct };
