import { AuthService } from '../services/auth.service.js';

const registerSchema = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
    },
};

export default async function authRoutes(fastify) {
    const authService = new AuthService(fastify.db);

    // POST /auth/register
    fastify.post('/auth/register', {
        schema: {
            tags: ['auth'],
            summary: 'Register new user',
            body: registerSchema,
        },
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;
            const user = await authService.register(email, password);
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
            body: registerSchema,
        },
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;
            const user = await authService.login(email, password);
            request.session.user = user;
            await request.session.save();
            return reply.send({ message: 'Logged in', user });
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
        if (request.session.user) {
            await request.session.destroy();
        }
        return reply.code(204).send();
    });
}
