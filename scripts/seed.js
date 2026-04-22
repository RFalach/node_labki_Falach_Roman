import { create } from '../repositories/item.repository.js';

const INVENTORY = [
    { name: 'Monitor', price: 500, qty: 10 },
    { name: 'Keyboard', price: 50, qty: 30 },
    { name: 'Headphones', price: 75, qty: 20 },
];

async function seed() {
    for (const item of INVENTORY) {
        await create(item);
    }

    console.log('Seed completed');
}

seed();
