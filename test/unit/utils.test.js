import { describe, it, expect } from 'vitest';
import { getFullImageUrl } from '../../utils/image.utils.js';
import { eventBus } from '../../utils/eventBus.utils.js';

describe('Image Utils', () => {
    it('should return null for null path', () => {
        expect(getFullImageUrl({}, null)).toBe(null);
    });

    it('should return full URL for external image', () => {
        const url = getFullImageUrl({ protocol: 'http', hostname: 'localhost', port: 5000 }, '/1/image.jpg');
        expect(url).toBe('http://localhost:5000/uploads/1/image.jpg');
    });

    it('should keep external URLs unchanged', () => {
        const url = getFullImageUrl({}, 'https://example.com/img.jpg');
        expect(url).toBe('https://example.com/img.jpg');
    });
});

describe('EventBus', () => {
    it('should emit and receive events', async () => {
        const received = [];
        const handler = (data) => received.push(data);

        eventBus.on('test', handler);
        eventBus.emit('test', { id: 1 });
        eventBus.off('test', handler);

        expect(received).toEqual([{ id: 1 }]);
    });

    it('should emit events once', async () => {
        let count = 0;
        eventBus.once('once-test', () => count++);
        eventBus.emit('once-test');
        eventBus.emit('once-test');
        expect(count).toBe(1);
    });
});
