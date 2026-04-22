import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import ItemModel from '../models/item.model.js';

export async function checkSchema(fastify) {
    const versionPath = path.join('data', 'version.json');

    function hashModel(model) {
        const json = JSON.stringify(model, Object.keys(model).sort());
        return crypto.createHash('md5').update(json).digest('hex');
    }

    const currentHash = hashModel(ItemModel);

    if (!fsSync.existsSync(versionPath)) {
        await fs.writeFile(
            versionPath,
            JSON.stringify({ hash: currentHash }, null, 2)
        );
        return;
    }

    try {
        const versionData = await fs.readFile(versionPath, 'utf-8');
        const savedHash = JSON.parse(versionData).hash;

        if (savedHash !== currentHash) {
            fastify.log.warn(
                'Data schema changed. Run "npm run migrate" to update existing files.'
            );
        }
    } catch (err) {
        fastify.log.warn(
            'Failed to read version.json. Consider running migration.'
        );
    }
}
