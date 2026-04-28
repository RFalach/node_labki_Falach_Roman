import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'reference.json');
const CACHE_TTL = 120 * 1000;

async function ensureCacheDir() {
    await fs.mkdir(CACHE_DIR, { recursive: true });
}

function isCacheValid() {
    if (!fsSync.existsSync(CACHE_FILE)) return false;
    
    const stats = fsSync.statSync(CACHE_FILE);
    const age = Date.now() - stats.mtimeMs;
    return age < CACHE_TTL;
}

async function getFromCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function saveToCache(data) {
    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (attempt === retries - 1) {
                throw error;
            }

            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export async function fetchExternalData(url) {
    if (isCacheValid()) {
        console.log('Returning cached data');
        return await getFromCache();
    }

    try {
        console.log('Fetching from external service...');
        const data = await fetchWithRetry(url);
        
        await saveToCache(data);
        
        return data;
    } catch (error) {
        console.log('External service unavailable:', error.message);
        
        const cachedData = await getFromCache();
        if (cachedData) {
            return cachedData;
        }
        
        return null;
    }
}
