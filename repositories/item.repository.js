import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';

let db;

export function initRepository(database) {
    db = database;
}

export async function findAll() {
    return db.select().from(products).orderBy(products.id);
}

export async function findById(id) {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0] || null;
}

export async function create(data) {
    const { name, price, qty, category, image } = data;
    const result = await db.insert(products).values({
        name,
        price: String(price),
        qty,
        category: category || '',
        image: image || null,
    });
    
    return findById(result[0].insertId);
}

export async function update(id, updates) {
    if (updates.price) updates.price = String(updates.price);
    await db.update(products).set(updates).where(eq(products.id, id));
    return findById(id);
}

export async function remove(id) {
    const result = await db.delete(products).where(eq(products.id, id));
    return result[0].affectedRows > 0;
}
