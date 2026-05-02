let pool;

export function initRepository(db) {
    pool = db;
}

export async function findAll() {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return rows;
}

export async function findById(id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0] || null;
}

export async function create(data) {
    const { name, price, qty, category, image } = data;
    const [result] = await pool.query(
        'INSERT INTO products (name, price, qty, category, image) VALUES (?, ?, ?, ?, ?)',
        [name, price, qty, category || '', image || null]
    );
    
    return findById(result.insertId);
}

export async function update(id, updates) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (['name', 'price', 'qty', 'category', 'image'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    if (fields.length === 0) return findById(id);
    
    values.push(id);
    await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    
    return findById(id);
}

export async function remove(id) {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
}
