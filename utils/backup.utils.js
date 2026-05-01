import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function createBackup() {
    try {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });

        const files = await fs.readdir(ITEMS_DIR);
        
        if (files.length === 0) {
            console.log('No files to backup');
            return;
        }

        const backupFile = path.join(BACKUPS_DIR, `${getTimestamp()}.gz`);
        const gzip = createGzip();
        const writeStream = fsSync.createWriteStream(backupFile);

        await pipeline(
            async function* () {
                for (const file of files.sort()) {
                    const filePath = path.join(ITEMS_DIR, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const product = JSON.parse(content);
                    yield JSON.stringify(product) + '\n';
                }
            },
            gzip,
            writeStream
        );

        console.log(`Backup created: ${backupFile}`);
        await cleanOldBackups();
    } catch (err) {
        console.error('Backup error:', err.message);
    }
}

async function cleanOldBackups() {
    const files = await fs.readdir(BACKUPS_DIR);
    
    const backups = files
        .filter(f => f.endsWith('.gz'))
        .sort();

    if (backups.length <= 5) return;

    const toDelete = backups.slice(0, backups.length - 5);

    for (const file of toDelete) {
        const fullPath = path.join(BACKUPS_DIR, file);
        await fs.unlink(fullPath);
        console.log(`Deleted old backup: ${file}`);
    }
}
