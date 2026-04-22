import fs from 'fs/promises';
import path from 'path';

export async function atomicWrite(filePath, data) {
    const tempPath = filePath.replace('.json', '.tmp.json');

    try {
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

        await fs.rename(tempPath, filePath);
    } catch (error) {
        try {
            await fs.unlink(tempPath);
        } catch {}

        throw error;
    }
}
