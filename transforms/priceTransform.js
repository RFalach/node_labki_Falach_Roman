import { Transform } from 'stream';

export class PriceTransform extends Transform {
    constructor(rate) {
        super({ objectMode: true });
        this.rate = rate;
    }

    _transform(chunk, encoding, callback) {
        const product = {
            ...chunk,
            price: chunk.price * this.rate
        };
        this.push(product);
        callback();
    }
}
