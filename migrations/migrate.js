import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import ItemModel from '../models/item.model.js';

import { atomicWrite } from '../utils/file.utils.js';

function hashModel(model) {
    const json = JSON.stringify(model, Object.keys(model).sort());
    return crypto.createHash('md5').update(json).digest('hex');
}

const currentHash = hashModel(ItemModel);
const versionPath = path.join('data', 'version.json');
const itemsDir = path.join('data', 'items');

let savedHash = null;

if (fs.existsSync(versionPath)) {
    try {
        const versionData = await fsp.readFile(versionPath, 'utf-8');
        savedHash = JSON.parse(versionData).hash;
    } catch (err) {
        console.error('Error reading version.json, will recreate it.');
    }
}

if (!savedHash) {
    await atomicWrite(versionPath, { hash: currentHash });
    console.log('Version file created.');
    process.exit(0);
}

if (savedHash === currentHash) {
    console.log('No migration needed. Data schema unchanged.');
    process.exit(0);
}

console.log('Data schema changed. Running migration...');

if (!fs.existsSync(itemsDir)) {
    console.log('Items directory does not exist. Nothing to migrate.');
} else {
    const files = await fsp.readdir(itemsDir);
    for (const file of files) {
        const filePath = path.join(itemsDir, file);

        if ((await fsp.stat(filePath)).isFile() && file.endsWith('.json')) {
            let data = {};
            try {
                const content = await fsp.readFile(filePath, 'utf-8');
                data = JSON.parse(content);
            } catch (err) {
                console.error(`Failed to read ${file}, skipping.`);
                continue;
            }

            for (const key in ItemModel) {
                if (!(key in data)) {
                    data[key] = ItemModel[key];
                }
            }

            await atomicWrite(filePath, data);
        }
    }

    await atomicWrite(versionPath, { hash: currentHash });
    console.log('Migration completed. Version updated.');
}
