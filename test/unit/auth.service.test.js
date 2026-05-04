import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../../services/auth.service.js';

describe('AuthService', () => {
    let authService;
    let mockDb;
    let mockJwt;
    let mockRedis;

    beforeEach(() => {
        mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            values: vi.fn(),
        };
        mockJwt = {
            sign: vi.fn().mockReturnValue('fake-token'),
            verify: vi.fn(),
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn(),
            del: vi.fn(),
        };
        authService = new AuthService(mockDb, mockJwt, mockRedis);
    });

    describe('register', () => {
        it('should throw error if email exists', async () => {
            mockDb.where.mockResolvedValueOnce([{ id: 1, email: 'test@test.com' }]);

            await expect(authService.register('test@test.com', '123456'))
                .rejects.toThrow('Email already exists');
        });

        it('should create user successfully', async () => {
            mockDb.where.mockResolvedValueOnce([]);
            mockDb.values.mockResolvedValueOnce([{ insertId: 1 }]);

            const result = await authService.register('new@test.com', '123456');

            expect(result).toEqual({ id: 1, email: 'new@test.com' });
        });
    });

    describe('login', () => {
        it('should throw error if user not found', async () => {
            mockDb.where.mockResolvedValueOnce([]);

            await expect(authService.login('test@test.com', '123456'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should return tokens on successful login', async () => {
            const argon2 = await import('argon2');
            const hash = await argon2.hash('123456');
            
            mockDb.where.mockResolvedValueOnce([{ id: 1, email: 'test@test.com', password: hash }]);

            const result = await authService.login('test@test.com', '123456');

            expect(result.user).toEqual({ id: 1, email: 'test@test.com' });
            expect(result.accessToken).toBe('fake-token');
            expect(result.refreshToken).toBe('fake-token');
        });
    });
});
