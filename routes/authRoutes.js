import { AuthService } from '../services/auth.service.js';

const authSchema = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
    },
};

export default async function authRoutes(fastify) {
    const authService = new AuthService(fastify.db, fastify.jwt, fastify.redis);

    // POST /auth/register
    fastify.post('/auth/register', {
        schema: {
            tags: ['auth'],
            summary: 'Register new user',
            body: authSchema,
        },
    }, async (request, reply) => {
        try {
            const user = await authService.register(request.body.email, request.body.password);
            return reply.code(201).send({ message: 'Registered', user });
        } catch (err) {
            if (err.message === 'Email already exists') {
                return reply.conflict(err.message);
            }
            throw err;
        }
    });

    // POST /auth/login
    fastify.post('/auth/login', {
        schema: {
            tags: ['auth'],
            summary: 'Login user',
            body: authSchema,
        },
    }, async (request, reply) => {
        try {
            const result = await authService.login(request.body.email, request.body.password);
            
            reply.setCookie('refresh_token', result.refreshToken, {
                httpOnly: true,
                maxAge: 7 * 86400,
                path: '/',
            });

            return reply.send({
                message: 'Logged in',
                user: result.user,
                accessToken: result.accessToken,
            });
        } catch (err) {
            return reply.unauthorized(err.message);
        }
    });

    // POST /auth/refresh
    fastify.post('/auth/refresh', {
        schema: {
            tags: ['auth'],
            summary: 'Refresh access token',
        },
    }, async (request, reply) => {
        const refreshToken = request.cookies.refresh_token;
        if (!refreshToken) {
            return reply.unauthorized('No refresh token');
        }

        try {
            const result = await authService.refresh(refreshToken);
            return reply.send(result);
        } catch (err) {
            return reply.unauthorized(err.message);
        }
    });

    // POST /auth/logout
    fastify.post('/auth/logout', {
        schema: {
            tags: ['auth'],
            summary: 'Logout user',
        },
    }, async (request, reply) => {
        const authHeader = request.headers.authorization;
        const accessToken = authHeader ? authHeader.replace('Bearer ', '') : '';
        const refreshToken = request.cookies.refresh_token || '';

        await authService.logout(accessToken, refreshToken);
        reply.clearCookie('refresh_token');
        return reply.code(204).send();
    });
}
