import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { products } from '../db/schema.js';

const seedData = [
    { name: 'iPhone 15', price: '999', qty: 10, category: 'Smartphones' },
    { name: 'MacBook Pro', price: '1999', qty: 5, category: 'Laptops' },
    { name: 'AirPods Pro', price: '249', qty: 20, category: 'Audio' },
];

async function seed() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DB || 'inventory',
    });
    
    const db = drizzle(pool);
    
    const force = process.argv.includes('--force');
    
    if (force) {
        await db.delete(products);
        console.log('Cleared existing products');
    }
    
    const existing = await db.select().from(products);
    if (existing.length > 0 && !force) {
        console.log('Database already has data. Use "seed:force" to re-seed.');
        await pool.end();
        return;
    }
    
    for (const product of seedData) {
        await db.insert(products).values(product);
    }
    
    console.log('Seed completed');
    await pool.end();
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
