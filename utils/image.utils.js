import fs from 'fs/promises';
import fsSync from 'fs'; // Додаємо синхронний fs для createWriteStream
import path from 'path';
import { pipeline } from 'stream/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function saveImage(id, file) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error(
            `Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed`
        );
    }

    const ext = file.mimetype === 'image/jpeg' ? '.jpg' : '.png';
    const filename = `image${ext}`;

    const userUploadDir = path.join(UPLOADS_DIR, String(id));
    await fs.mkdir(userUploadDir, { recursive: true });

    const filePath = path.join(userUploadDir, filename);

    await pipeline(file.file, fsSync.createWriteStream(filePath));

    return `/${id}/${filename}`;
}

export async function deleteImage(id) {
    try {
        const userUploadDir = path.join(UPLOADS_DIR, String(id));
        await fs.rm(userUploadDir, { recursive: true, force: true });
    } catch (error) {
        console.error(`Failed to delete image for id ${id}:`, error);
    }
}

export function getFullImageUrl(request, imagePath) {
    if (!imagePath) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    const protocol = request.protocol;
    const host = request.hostname;
    const port = request.port;

    const baseUrl = `${protocol}://${host}${port ? ':' + port : ''}`;
    return `${baseUrl}/uploads${imagePath}`;
}
