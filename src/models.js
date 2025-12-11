/**
 * Modelos de datos para el scraper.
 */

import 'dotenv/config';

export class Config {
    constructor() {
        this.categoryName = process.env.CATEGORY_NAME || 'Acrylics & Relines';
        this.maxPages = parseInt(process.env.MAX_PAGES || '2', 10);
        this.minDelay = parseFloat(process.env.MIN_DELAY || '1');
        this.maxDelay = parseFloat(process.env.MAX_DELAY || '3');
        this.outputFile = process.env.OUTPUT_FILE || 'productos.json';
        this.storageType = process.env.STORAGE_TYPE || 'json';
        this.dbPath = process.env.DB_PATH || 'productos.db';
        this.scraperType = process.env.SCRAPER_TYPE || 'http';
        this.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            'accept-language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        };
    }
}

export class Statistics {
    constructor() {
        this.categoryUrl = '';
        this.totalDetected = 0;
        this.totalSaved = 0;
        this.totalSkipped = 0;
        this.missingPrice = 0;
        this.startedAt = '';
        this.finishedAt = '';
        this.durationSeconds = 0;
    }

    toDict() {
        return {
            categoryUrl: this.categoryUrl,
            totalDetected: this.totalDetected,
            totalSaved: this.totalSaved,
            totalSkipped: this.totalSkipped,
            missingPrice: this.missingPrice,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            durationSeconds: this.durationSeconds
        };
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('ESTADÍSTICAS DE LA CORRIDA');
        console.log('='.repeat(50));
        console.log(JSON.stringify(this.toDict(), null, 2));
        console.log('='.repeat(50));
    }
}
