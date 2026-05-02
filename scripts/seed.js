import mongoose from 'mongoose';
import Product from '../db/models/product.model.js';

const seedData = [
    { name: 'iPhone 15', price: 999, qty: 10, category: 'Smartphones' },
    { name: 'MacBook Pro', price: 1999, qty: 5, category: 'Laptops' },
    { name: 'AirPods Pro', price: 249, qty: 20, category: 'Audio' },
];

const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'inventory';

async function seed() {
    await mongoose.connect(`${url}/${dbName}`);
    
    const force = process.argv.includes('--force');
    
    if (force) {
        await Product.deleteMany({});
        console.log('Cleared existing products');
    }
    
    const count = await Product.countDocuments();
    if (count > 0 && !force) {
        console.log('Database already has data. Use "seed:force" to re-seed.');
        await mongoose.disconnect();
        return;
    }
    
    await Product.insertMany(seedData);
    console.log('Seed completed');
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
