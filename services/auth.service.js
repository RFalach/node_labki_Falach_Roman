import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import crypto from 'crypto';

export class AuthService {
    constructor(db, jwt, redis) {
        this.db = db;
        this.jwt = jwt;
        this.redis = redis;
    }

    async register(email, password) {
        const existing = await this.db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
            throw new Error('Email already exists');
        }

        const hashedPassword = await argon2.hash(password);
        const result = await this.db.insert(users).values({
            email,
            password: hashedPassword,
        });

        return { id: result[0].insertId, email };
    }

    async login(email, password) {
        const result = await this.db.select().from(users).where(eq(users.email, email));
        if (result.length === 0) {
            throw new Error('Invalid email or password');
        }

        const user = result[0];
        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            throw new Error('Invalid email or password');
        }

        const jti = crypto.randomUUID();

        const accessToken = this.jwt.sign(
            { id: user.id, email: user.email },
            { expiresIn: '15m', jti }
        );

        const refreshToken = this.jwt.sign(
            { id: user.id, jti },
            { expiresIn: '7d' }
        );

        await this.redis.setex(`refresh:${user.id}`, 7 * 86400, refreshToken);

        return {
            user: { id: user.id, email: user.email },
            accessToken,
            refreshToken,
        };
    }

    async refresh(refreshToken) {
        try {
            const decoded = this.jwt.verify(refreshToken);
            const storedToken = await this.redis.get(`refresh:${decoded.id}`);
            
            if (!storedToken || storedToken !== refreshToken) {
                throw new Error('Invalid refresh token');
            }

            const user = await this.db.select().from(users).where(eq(users.id, decoded.id));
            if (user.length === 0) {
                throw new Error('User not found');
            }

            const jti = crypto.randomUUID();
            const accessToken = this.jwt.sign(
                { id: user[0].id, email: user[0].email },
                { expiresIn: '15m', jti }
            );

            return { accessToken };
        } catch (err) {
            throw new Error('Invalid refresh token');
        }
    }

    async logout(accessToken, refreshToken) {
        try {
            const decoded = this.jwt.verify(accessToken);
 
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await this.redis.setex(`blacklist:${decoded.jti}`, ttl, '1');
            }
        } catch (err) {
 
        }

        try {
            const decoded = this.jwt.verify(refreshToken);
            await this.redis.del(`refresh:${decoded.id}`);
        } catch (err) {
 
        }
    }
}
