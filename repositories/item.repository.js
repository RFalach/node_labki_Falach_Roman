import fs from 'fs/promises';
import path from 'path';
import ItemModel from '../models/item.model.js';
import { atomicWrite } from '../utils/file.utils.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');

async function ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

function getFilePath(id) {
    return path.join(DATA_DIR, `${id}.json`);
}

export async function findAll() {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);

    const items = await Promise.all(
        files.map(async (file) => {
            const content = await fs.readFile(
                path.join(DATA_DIR, file),
                'utf-8'
            );
            return JSON.parse(content);
        })
    );

    return items;
}

export async function findById(id) {
    try {
        const content = await fs.readFile(getFilePath(id), 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

export async function create(data) {
    const items = await findAll();
    const lastId = items.length ? Math.max(...items.map((i) => i.id)) : 0;

    const newItem = {
        ...ItemModel,
        ...data,
        id: lastId + 1,
    };

    await atomicWrite(getFilePath(newItem.id), newItem);

    return newItem;
}

export async function update(id, updates) {
    const item = await findById(id);
    if (!item) return null;

    const updated = {
        ...item,
        ...updates,
    };

    await atomicWrite(getFilePath(id), updated);

    return updated;
}

export async function remove(id) {
    try {
        await fs.unlink(getFilePath(id));
        return true;
    } catch {
        return false;
    }
}
