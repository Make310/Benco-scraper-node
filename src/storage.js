/**
 * Módulo de almacenamiento de datos.
 * Implementa el patrón Strategy para soportar múltiples backends.
 */

import { writeFileSync } from 'fs';
import Database from 'better-sqlite3';

// ===========================================
// CLASE ABSTRACTA BASE
// ===========================================

class BaseStorage {
    save(data) {
        throw new Error('Method save() must be implemented');
    }
}

// ===========================================
// IMPLEMENTACIÓN JSON
// ===========================================

class JsonStorage extends BaseStorage {
    constructor(filepath, indent = 2) {
        super();
        this.filepath = filepath;
        this.indent = indent;
    }

    save(data) {
        try {
            writeFileSync(this.filepath, JSON.stringify(data, null, this.indent), 'utf-8');
            return true;
        } catch (error) {
            console.log(`[ERROR] No se pudo guardar el archivo JSON: ${error.message}`);
            return false;
        }
    }
}

// ===========================================
// IMPLEMENTACIÓN SQLITE
// ===========================================

class SqliteStorage extends BaseStorage {
    constructor(dbPath = 'productos.db') {
        super();
        this.dbPath = dbPath;
        this.db = new Database(dbPath);
        this._createTables();
    }

    _createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                price TEXT DEFAULT '',
                availability TEXT DEFAULT '',
                brand TEXT DEFAULT '',
                product_category TEXT DEFAULT '',
                image_url TEXT DEFAULT '',
                product_url TEXT DEFAULT '',
                rating TEXT DEFAULT '',
                review_count TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_url TEXT DEFAULT '',
                total_detected INTEGER DEFAULT 0,
                total_saved INTEGER DEFAULT 0,
                total_skipped INTEGER DEFAULT 0,
                missing_price INTEGER DEFAULT 0,
                started_at TEXT DEFAULT '',
                finished_at TEXT DEFAULT '',
                duration_seconds REAL DEFAULT 0.0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    save(data) {
        try {
            const statsData = data.statistics || {};
            const insertStats = this.db.prepare(`
                INSERT INTO statistics (category_url, total_detected, total_saved, total_skipped, missing_price, started_at, finished_at, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertStats.run(
                statsData.categoryUrl || '',
                statsData.totalDetected || 0,
                statsData.totalSaved || 0,
                statsData.totalSkipped || 0,
                statsData.missingPrice || 0,
                statsData.startedAt || '',
                statsData.finishedAt || '',
                statsData.durationSeconds || 0
            );

            const products = data.products || [];
            let savedCount = 0;
            let skippedCount = 0;

            const insertProduct = this.db.prepare(`
                INSERT OR IGNORE INTO products (sku, name, price, availability, brand, product_category, image_url, product_url, rating, review_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const product of products) {
                const result = insertProduct.run(
                    product.sku || '',
                    product.name || '',
                    product.price || '',
                    product.availability || '',
                    product.brand || '',
                    product.product_category || '',
                    product.image_url || '',
                    product.product_url || '',
                    product.rating || '',
                    product.review_count || ''
                );

                if (result.changes > 0) {
                    savedCount++;
                } else {
                    skippedCount++;
                }
            }

            console.log(`  [DB] Guardados: ${savedCount} | Ya existían: ${skippedCount}`);
            return true;
        } catch (error) {
            console.log(`[ERROR] No se pudo guardar en la base de datos: ${error.message}`);
            return false;
        }
    }
}

// ===========================================
// FACTORY
// ===========================================

export class StorageFactory {
    static create(storageType, options = {}) {
        const type = storageType.toLowerCase();

        if (type === 'json') {
            return new JsonStorage(options.filepath || 'productos.json', options.indent || 2);
        } else if (type === 'sqlite') {
            return new SqliteStorage(options.dbPath || 'productos.db');
        } else {
            throw new Error(`Tipo de storage no soportado: ${storageType}`);
        }
    }
}
