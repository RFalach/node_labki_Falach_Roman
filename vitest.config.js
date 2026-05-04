import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['repositories/**', 'services/**', 'utils/**', 'controllers/**'],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70,
            },
        },
    },
});
