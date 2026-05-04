import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import envSchema from '../../schemas/env.schema.js';
import sensible from '@fastify/sensible';
import fastifyRedis from '@fastify/redis';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import drizzlePlugin from '../../db/drizzle.js';
import productRoutes from '../../routes/productRoutes.js';
import productRoutesV2 from '../../routes/productRoutesV2.js';
import authRoutes from '../../routes/authRoutes.js';
import mysql from 'mysql2/promise';

let fastify;
let pool;

beforeAll(async () => {
    pool = mysql.createPool({
        host: 'localhost', port: 3306, user: 'fastify', password: 'fastify123',
        database: 'inventory_test',
    });

    fastify = Fastify({ logger: false });
    await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });
    await fastify.register(sensible);
    await fastify.register(fastifyRedis, { host: 'localhost', port: 6379 });
    await fastify.register(fastifyCookie);
    await fastify.register(fastifyJwt, {
        secret: 'jwt-secret-for-testing-32-characters!',
        cookie: { cookieName: 'refresh_token', signed: false },
        trusted: async (request, decoded) => {
            return !(await fastify.redis.get(`blacklist:${decoded.jti}`));
        },
    });
    await fastify.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
    await fastify.register(fastifyRateLimit, { max: 1000, timeWindow: '1 minute', redis: fastify.redis });
    await fastify.register(fastifySwagger, { openapi: { info: { title: 'Test', version: '1.0.0' } } });
    await fastify.register(fastifySwaggerUi, { routePrefix: '/docs' });
    await fastify.register(drizzlePlugin);
    fastify.register(productRoutes, { prefix: '/api/v1' });
    fastify.register(productRoutesV2, { prefix: '/api/v2' });
    fastify.register(authRoutes);
    await fastify.ready();
});

afterAll(async () => {
    await fastify.close();
    await pool.end();
});

beforeEach(async () => {
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM users');
    const keys = await fastify.redis.keys('*');
    if (keys.length > 0) await fastify.redis.del(keys);
});

describe('Products API', () => {
    describe('GET /api/v1/products', () => {
        it('should return empty list', async () => {
            const res = await fastify.inject({ method: 'GET', url: '/api/v1/products' });
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).count).toBe(0);
        });

        it('should return products', async () => {
            await pool.query('INSERT INTO products (name, price, qty) VALUES (?, ?, ?)', ['T', 100, 5]);
            const res = await fastify.inject({ method: 'GET', url: '/api/v1/products' });
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).count).toBe(1);
        });
    });

    describe('POST /api/v1/products', () => {
        it('should return 401 without token', async () => {
            const res = await fastify.inject({
                method: 'POST', url: '/api/v1/products', payload: { name: 'T', price: 100, qty: 1 },
            });
            expect(res.statusCode).toBe(401);
        });
    });

    describe('Auth + CRUD', () => {
        let token;

        beforeEach(async () => {
            await fastify.inject({ method: 'POST', url: '/auth/register', payload: { email: 'a@a.com', password: '123456' } });
            const login = await fastify.inject({ method: 'POST', url: '/auth/login', payload: { email: 'a@a.com', password: '123456' } });
            token = JSON.parse(login.body).accessToken;
        });

        it('should create product', async () => {
            const res = await fastify.inject({
                method: 'POST', url: '/api/v1/products',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'New', price: 10, qty: 1 },
            });
            expect(res.statusCode).toBe(201);
        });

        it('should return 404 for non-existing', async () => {
            const res = await fastify.inject({
                method: 'PATCH', url: '/api/v1/products/9999',
                headers: { Authorization: `Bearer ${token}` },
                payload: { price: 75 },
            });
            expect(res.statusCode).toBe(404);
        });

        it('should export CSV', async () => {
            const res = await fastify.inject({ method: 'GET', url: '/api/v1/products/export' });
            expect(res.statusCode).toBe(200);
        });

        it('should stream NDJSON', async () => {
            const res = await fastify.inject({ method: 'GET', url: '/api/v1/products/stream' });
            expect(res.statusCode).toBe(200);
        });

        it('should paginate v2', async () => {
            const res = await fastify.inject({ method: 'GET', url: '/api/v2/products' });
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).meta).toBeDefined();
        });

        it('should reject duplicate email', async () => {
            const res = await fastify.inject({ method: 'POST', url: '/auth/register', payload: { email: 'a@a.com', password: '123456' } });
            expect(res.statusCode).toBe(409);
        });
    });
});
