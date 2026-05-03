import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

export class AuthService {
    constructor(db) {
        this.db = db;
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

        return { id: user.id, email: user.email };
    }
}
