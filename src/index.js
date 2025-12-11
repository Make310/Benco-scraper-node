/**
 * Benco Dental Web Scraper
 * ========================
 * Punto de entrada principal y orquestación del scraping.
 *
 * Uso:
 *     npm run scrape
 */

import { Config, Statistics } from './models.js';
import { ScraperFactory } from './scraper.js';
import { StorageFactory } from './storage.js';

function formatDateTime(date) {
    return date.toISOString().replace('T', ' ').substring(0, 19);
}

function randomDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => {
        console.log(`  Esperando ${delay.toFixed(1)}s...`);
        setTimeout(resolve, delay * 1000);
    });
}

class Orchestrator {
    constructor(config) {
        this.config = config;
        this.scraper = ScraperFactory.create(config.scraperType, config);
        this.storage = StorageFactory.create(config.storageType, {
            filepath: config.outputFile,
            dbPath: config.dbPath
        });
        this.stats = new Statistics();
    }

    async run() {
        const startTime = new Date();
        this.stats.startedAt = formatDateTime(startTime);

        console.log('='.repeat(50));
        console.log('BENCO DENTAL SCRAPER');
        console.log('='.repeat(50));
        console.log(`Categoría: ${this.config.categoryName}`);
        console.log(`Max páginas: ${this.config.maxPages}`);
        console.log(`Delay: ${this.config.minDelay}-${this.config.maxDelay}s`);
        console.log(`Scraper: ${this.config.scraperType.toUpperCase()}`);
        console.log('='.repeat(50) + '\n');

        // Inicializar scraper (necesario para Puppeteer)
        await this.scraper.init();

        const allProducts = [];
        const seenSkus = new Set();
        let categoryInfo = {};
        let totalPagesToScrape = this.config.maxPages;

        for (let page = 1; page <= totalPagesToScrape; page++) {
            console.log(`[Página ${page}/${totalPagesToScrape}]`);

            const html = await this.scraper.fetchPage(this.config.categoryName, page);

            if (html === null) {
                console.log(`  [SKIP] Página ${page} falló, continuando...`);
                continue;
            }

            if (page === 1) {
                categoryInfo = this.scraper.getCategoryInfo(html);
                this.stats.categoryUrl = categoryInfo.url || '';
                const total = categoryInfo.totalProducts || 0;
                const totalPages = Math.ceil(total / 24);
                console.log(`  Categoría: ${categoryInfo.name}`);
                console.log(`  Total en sitio: ${total} productos (${totalPages} páginas)`);

                if (this.config.maxPages === 0) {
                    totalPagesToScrape = totalPages;
                }
            }

            const { products, detected, skipped } = this.scraper.parseProducts(html, seenSkus, this.config.categoryName);

            this.stats.totalDetected += detected;
            this.stats.totalSkipped += skipped;
            this.stats.totalSaved += products.length;

            allProducts.push(...products);
            console.log(`  Detectados: ${detected} | Guardados: ${products.length} | Omitidos: ${skipped}`);

            if (page < totalPagesToScrape) {
                await randomDelay(this.config.minDelay, this.config.maxDelay);
            }
        }

        this.stats.missingPrice = allProducts.filter(p => p.price === '').length;

        const endTime = new Date();
        this.stats.finishedAt = formatDateTime(endTime);
        this.stats.durationSeconds = Math.round((endTime - startTime) / 10) / 100;

        const outputData = {
            statistics: this.stats.toDict(),
            products: allProducts
        };

        // Cerrar scraper (necesario para Puppeteer)
        await this.scraper.close();

        const outputLocation = this.config.storageType === 'sqlite' ? this.config.dbPath : this.config.outputFile;
        if (this.storage.save(outputData)) {
            console.log(`\nGuardado en: ${outputLocation}`);
        }

        this.stats.printSummary();

        return outputData;
    }
}

async function main() {
    const config = new Config();
    const orchestrator = new Orchestrator(config);
    await orchestrator.run();
}

main();
