import fs from 'fs/promises';
import { parse } from 'csv-parse';
import { validateProduct } from './validation.utils.js';
import * as productRepository from '../repositories/item.repository.js';

export async function processImportedFile(filePath, fileType) {
    const content = await fs.readFile(filePath, 'utf-8');
    let items = [];

    if (fileType === 'csv') {
        items = await parseCSV(content);
    } else if (fileType === 'json') {
        items = parseJSON(content);
    } else {
        throw new Error('Unsupported file type');
    }

    const result = {
        imported: 0,
        rejected: 0,
        errors: [],
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const validation = validateProduct(item);

        if (validation.valid) {
            try {
                await productRepository.create(validation.data);
                result.imported++;
            } catch (error) {
                result.rejected++;
                result.errors.push({
                    row: i + 1,
                    reason: `Database error: ${error.message}`,
                });
            }
        } else {
            result.rejected++;
            result.errors.push({
                row: i + 1,
                reason: validation.errors.join(', '),
            });
        }
    }

    return result;
}

async function parseCSV(content) {
    return new Promise((resolve, reject) => {
        parse(
            content,
            {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                cast: (value, context) => {
                    if (
                        context.column === 'price' ||
                        context.column === 'qty'
                    ) {
                        const num = Number(value);
                        return isNaN(num) ? value : num;
                    }
                    if (value === '') {
                        return null;
                    }
                    return value;
                },
            },
            (err, records) => {
                if (err) reject(err);
                else resolve(records);
            }
        );
    });
}

function parseJSON(content) {
    try {
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [data];
    } catch (error) {
        throw new Error('Invalid JSON format');
    }
}
