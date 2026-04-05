const {
    getProducts,
    postProduct,
    patchProduct,
    deleteProduct,
} = require('../controllers/productController');

function handleProductRoutes(req, res, parsedUrl, method, pathname, body) {
    if (method === 'GET' && pathname === '/products') {
        return getProducts(res, parsedUrl);
    }
    if (method === 'POST' && pathname === '/products') {
        return postProduct(res, body);
    }
    if (method === 'PATCH' && pathname.startsWith('/products/')) {
        const id = parseInt(pathname.split('/')[2], 10);
        return patchProduct(res, id, body);
    }
    if (method === 'DELETE' && pathname.startsWith('/products/')) {
        const id = parseInt(pathname.split('/')[2], 10);
        return deleteProduct(res, id);
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = handleProductRoutes;
