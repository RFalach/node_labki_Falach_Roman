import fs from 'fs/promises';
import path from 'path';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function createBackup() {
    try {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });

        const backupPath = path.join(BACKUPS_DIR, getTimestamp());
        await fs.mkdir(backupPath);

        const files = await fs.readdir(ITEMS_DIR);

        for (const file of files) {
            const src = path.join(ITEMS_DIR, file);
            const dest = path.join(backupPath, file);
            await fs.copyFile(src, dest);
        }

        await cleanOldBackups();
    } catch (err) {
        console.error('Backup error:', err.message);
    }
}

async function cleanOldBackups() {
    const dirs = await fs.readdir(BACKUPS_DIR);

    const sorted = dirs.sort();

    if (sorted.length <= 5) return;

    const toDelete = sorted.slice(0, sorted.length - 5);

    for (const dir of toDelete) {
        const fullPath = path.join(BACKUPS_DIR, dir);
        await fs.rm(fullPath, { recursive: true, force: true });
    }
}
