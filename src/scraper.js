/**
 * Scraper para Benco Dental.
 * Implementa el patrón Strategy para soportar HTTP y Puppeteer.
 */

import { gzipSync } from 'zlib';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const BASE_URL = 'https://shop.benco.com';

// ===========================================
// CLASE BASE (ABSTRACT)
// ===========================================

class BaseScraper {
    constructor(config) {
        this.config = config;
    }

    async init() {
    }

    async close() {
    }

    async fetchPage(category, page) {
        throw new Error('Method fetchPage() must be implemented');
    }

    buildQueryParam(category, page = 1) {
        const data = {
            Categorization: {
                Tab: category,
                TabId: 0,
                CategoryId: 0
            },
            Page: page,
            GroupSimilarItems: true,
            AllowAutoCorrectSubstitution: false,
            Source: `Categories.${category.replace(/ /g, '').replace(/&/g, '')}`,
            ShowResultsAsGrid: true,
            IncludePricing: false,
            IsCompleteCart: false,
            IsGeneralSuggestion: false,
            SelectionCriterionDescription: category
        };

        const jsonStr = JSON.stringify(data);
        const compressed = gzipSync(Buffer.from(jsonStr, 'utf-8'));
        return compressed.toString('base64');
    }

    buildUrl(category, page) {
        const params = new URLSearchParams({ q: this.buildQueryParam(category, page) });
        return `${BASE_URL}/Search?${params}`;
    }

    parseProducts(html, seenSkus, categoryName) {
        const $ = cheerio.load(html);
        const products = [];
        let detected = 0;
        let skipped = 0;

        const ratingsMap = this._extractRatingsFromJsonLd($);
        const productGrid = $('.product-grid');

        if (!productGrid.length) {
            return { products, detected, skipped };
        }

        productGrid.children('div').each((_, item) => {
            detected++;

            const product = {
                sku: '',
                name: '',
                price: '',
                availability: '',
                brand: '',
                product_category: '',
                image_url: '',
                product_url: '',
                rating: '',
                review_count: ''
            };

            const link = $(item).find('a[href*="/Product/"]').first();
            if (!link.length) {
                skipped++;
                return;
            }

            const href = link.attr('href') || '';
            const skuMatch = href.match(/\/Product\/([^/]+)\//);
            if (!skuMatch) {
                skipped++;
                return;
            }

            const sku = skuMatch[1];
            if (seenSkus.has(sku)) {
                skipped++;
                return;
            }

            product.sku = sku;
            seenSkus.add(sku);

            product.product_url = `${BASE_URL}${href.split('?')[0]}`;

            // Limpiar texto: colapsar whitespace y remover CSS/HTML residual
            const rawName = link.text()
                .replace(/\s+/g, ' ')
                .replace(/\.[\w-]+\s*>\s*[\w-]+\s*\{[^}]*\}/g, '')
                .trim();
            const cleanName = rawName
                .replace(/(No Longer Available|In Stock.*|Out of Stock|Estimated Ship Date.*|\d{4}-\d{3}).*$/i, '')
                .trim();
            product.name = cleanName;

            const img = $(item).find('img').first();
            if (img.length) {
                product.image_url = img.attr('src') || '';
            }

            product.availability = this._extractAvailability($(item));

            const { price, brand } = this._extractFromOnclick($(item));
            product.price = price;
            product.brand = brand;
            product.product_category = categoryName;

            if (ratingsMap[cleanName]) {
                product.rating = ratingsMap[cleanName].rating;
                product.review_count = ratingsMap[cleanName].reviewCount;
            }

            products.push(product);
        });

        return { products, detected, skipped };
    }

    _extractRatingsFromJsonLd($) {
        const ratingsMap = {};

        $('script[type="application/ld+json"]').each((_, script) => {
            try {
                const data = JSON.parse($(script).html());
                if (data['@type'] === 'AggregateRating') {
                    const itemReviewed = data.itemReviewed || {};
                    const productName = itemReviewed.name || '';
                    if (productName) {
                        ratingsMap[productName] = {
                            rating: data.ratingValue || '',
                            reviewCount: data.ratingCount || ''
                        };
                    }
                }
            } catch {
                // Ignore JSON parse errors
            }
        });

        return ratingsMap;
    }

    _extractAvailability($item) {
        const stockPatterns = [
            /Estimated Ship Date \d{1,2}\/\d{1,2}\/\d{2,4}(?: - \d{1,2}\/\d{1,2}\/\d{2,4})?/i,
            /In Stock in \w+/i,
            /In Stock/i,
            /Out of Stock/i,
            /No Longer Available/i,
            /Ships in \d+ (?:day|week|business day)s?/i
        ];

        const itemText = $item.text();
        for (const pattern of stockPatterns) {
            const match = itemText.match(pattern);
            if (match) {
                return match[0].trim();
            }
        }

        return '';
    }

    _extractFromOnclick($item) {
        let price = '';
        let brand = '';

        const addToCartBtn = $item.find('button.add-to-cart-button').first();
        if (addToCartBtn.length) {
            const onclick = addToCartBtn.attr('onclick') || '';

            const priceMatch = onclick.match(/`,\s*'([\d.]+)'/);
            if (priceMatch) {
                price = priceMatch[1];
            }

            const brandMatch = onclick.match(/'[\d.]+',\s*`([^`]+)`/);
            if (brandMatch) {
                brand = brandMatch[1];
            }
        }

        return { price, brand };
    }

    getCategoryInfo(html) {
        const $ = cheerio.load(html);

        let result = { name: '', totalProducts: 0, url: '' };

        $('script[type="application/ld+json"]').each((_, script) => {
            try {
                const data = JSON.parse($(script).html());
                if (data['@type'] === 'OfferCatalog') {
                    result = {
                        name: data.name || '',
                        totalProducts: parseInt(data.numberOfItems || 0, 10),
                        url: data.url || ''
                    };
                    return false;
                }
            } catch {
                // Ignore JSON parse errors
            }
        });

        return result;
    }
}

// ===========================================
// IMPLEMENTACIÓN HTTP (fetch + cheerio)
// ===========================================

class HttpScraper extends BaseScraper {
    async fetchPage(category, page) {
        try {
            const url = this.buildUrl(category, page);

            const response = await fetch(url, {
                headers: this.config.headers,
                signal: AbortSignal.timeout(30000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.log(`  [ERROR] Página ${page}: ${error.message}`);
            return null;
        }
    }
}

// ===========================================
// IMPLEMENTACIÓN PUPPETEER
// ===========================================

class PuppeteerScraper extends BaseScraper {
    constructor(config) {
        super(config);
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('  [Puppeteer] Iniciando navegador...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent(this.config.headers['user-agent']);
        await this.page.setViewport({ width: 1280, height: 800 });
    }

    async close() {
        if (this.browser) {
            console.log('  [Puppeteer] Cerrando navegador...');
            await this.browser.close();
        }
    }

    async fetchPage(category, page) {
        try {
            const url = this.buildUrl(category, page);

            await this.page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Esperar a que cargue el grid de productos
            await this.page.waitForSelector('.product-grid', { timeout: 10000 });

            return await this.page.content();
        } catch (error) {
            console.log(`  [ERROR] Página ${page}: ${error.message}`);
            return null;
        }
    }
}

// ===========================================
// FACTORY
// ===========================================

export class ScraperFactory {
    static create(scraperType, config) {
        const type = scraperType.toLowerCase();

        if (type === 'http') {
            return new HttpScraper(config);
        } else if (type === 'puppeteer') {
            return new PuppeteerScraper(config);
        } else {
            throw new Error(`Tipo de scraper no soportado: ${scraperType}`);
        }
    }
}
