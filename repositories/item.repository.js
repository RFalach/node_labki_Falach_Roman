import Product from '../db/models/product.model.js';

export async function findAll() {
    const products = await Product.find().lean();
    return products.map(p => ({
        ...p,
        id: p._id.toString()
    }));
}

export async function findById(id) {
    const product = await Product.findById(id).lean();
    if (!product) return null;
    return {
        ...product,
        id: product._id.toString()
    };
}

export async function create(data) {
    const product = await Product.create(data);
    return product.toJSON();
}

export async function update(id, updates) {
    const product = await Product.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    ).lean();
    
    if (!product) return null;
    return {
        ...product,
        id: product._id.toString()
    };
}

export async function remove(id) {
    const result = await Product.findByIdAndDelete(id);
    return !!result;
}
