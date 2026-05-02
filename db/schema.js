import { mysqlTable, int, varchar, decimal, timestamp } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('products', {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    qty: int('qty').notNull().default(0),
    category: varchar('category', { length: 255 }).default(''),
    image: varchar('image', { length: 500 }).default(null),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
