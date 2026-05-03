import { REDIS_KEYS } from '../constants/redisKeys.js';

let redis;

export function initApiClient(r) {
    redis = r;
}

export async function fetchExternalData(url) {
    const cached = await redis.get(REDIS_KEYS.CACHE_REFERENCE);
    
    if (cached) {
        console.log('Returning cached data from Redis');
        return JSON.parse(cached);
    }

    try {
        console.log('Fetching from external service...');
        const response = await fetchWithRetry(url);
        
        await redis.setex(REDIS_KEYS.CACHE_REFERENCE, 120, JSON.stringify(response));
        
        return response;
    } catch (error) {
        console.log('External service unavailable:', error.message);
        
        if (cached) {
            return JSON.parse(cached);
        }
        
        return null;
    }
}

async function fetchWithRetry(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (attempt === retries - 1) throw error;

            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
