import mysql from 'mysql2/promise';

const seedData = [
    { name: 'iPhone 15', price: 999, qty: 10, category: 'Smartphones' },
    { name: 'MacBook Pro', price: 1999, qty: 5, category: 'Laptops' },
    { name: 'AirPods Pro', price: 249, qty: 20, category: 'Audio' },
];

const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'inventory',
};

async function seed() {
    const connection = await mysql.createConnection(config);
    
    const force = process.argv.includes('--force');
    
    if (force) {
        await connection.query('DELETE FROM products');
        console.log('Cleared existing products');
    }
    
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (rows[0].count > 0 && !force) {
        console.log('Database already has data. Use "seed:force" to re-seed.');
        await connection.end();
        return;
    }
    
    for (const product of seedData) {
        await connection.query(
            'INSERT INTO products (name, price, qty, category) VALUES (?, ?, ?, ?)',
            [product.name, product.price, product.qty, product.category]
        );
    }
    
    console.log('Seed completed');
    await connection.end();
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
