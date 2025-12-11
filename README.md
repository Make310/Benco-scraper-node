# Benco Dental Web Scraper

Scraper to extract products from [shop.benco.com](https://shop.benco.com).

> This project was initially developed in **Python** using `requests` and `BeautifulSoup`, and later migrated to **Node.js** with native `fetch` and `cheerio`.
>
> Repository: [github.com/Make310/Benco-scraper](https://github.com/Make310/Benco-scraper)

## Requirements

- Node.js >= 18.0.0

## Extracted Data

| Field | Description |
|-------|-------------|
| `sku` | Unique product identifier |
| `name` | Product name |
| `price` | Price (when available) |
| `availability` | Stock status / shipping date |
| `brand` | Manufacturer brand |
| `product_category` | Product category |
| `image_url` | Image URL |
| `product_url` | Product URL |
| `rating` | Average rating |
| `review_count` | Number of reviews |

## Installation

```bash
npm install
```

## Configuration

Edit the `.env` file:

```env
# Category to scrape (exact site name)
CATEGORY_NAME=Acrylics & Relines

# Pages to scrape (0 = all)
MAX_PAGES=2

# Delay between requests (seconds)
MIN_DELAY=1
MAX_DELAY=3

# Scraper type: http or puppeteer
SCRAPER_TYPE=http

# Storage type: json or sqlite
STORAGE_TYPE=json

# JSON output (when STORAGE_TYPE=json)
OUTPUT_FILE=productos.json

# SQLite database (when STORAGE_TYPE=sqlite)
DB_PATH=productos.db
```

### Example Categories

- `Acrylics & Relines`
- `Alloy`
- `Anesthetic`
- `Articulating`

> The name must match exactly with the website.

## Execution

```bash
npm run scrape
```

### Expected Output

```
==================================================
BENCO DENTAL SCRAPER
==================================================
Category: Acrylics & Relines
Max pages: 2
Delay: 1.0-3.0s
Scraper: HTTP
==================================================

[Page 1/2]
  Category: Acrylics and Relines
  Total on site: 1353 products (57 pages)
  Detected: 24 | Saved: 24 | Skipped: 0
  Waiting 2.3s...
[Page 2/2]
  Detected: 24 | Saved: 24 | Skipped: 0

Saved to: productos.json

==================================================
RUN STATISTICS
==================================================
{
  "categoryUrl": "https://shop.benco.com/Search?q=...",
  "totalDetected": 48,
  "totalSaved": 48,
  "totalSkipped": 0,
  "missingPrice": 40,
  "startedAt": "2025-12-10 17:30:00",
  "finishedAt": "2025-12-10 17:30:05",
  "durationSeconds": 5.23
}
==================================================
```

## Project Structure

```
test_scraping_node/
├── src/
│   ├── index.js       # Main orchestrator
│   ├── scraper.js     # Data extraction (BencoScraper)
│   ├── storage.js     # Persistence (JSON / SQLite)
│   └── models.js      # Data models
├── data/              # Directory for generated files
├── .env               # Configuration
├── .gitignore         # Ignored files
├── package.json       # Dependencies
└── README.md
```

## Architecture

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  index.js   │────>│    scraper.js     │     │   storage.js    │
│ Orchestrator│     │                   │     │                 │
└──────┬──────┘     │    BaseScraper    │     │  BaseStorage    │
       │            │        │          │     │       │         │
       │            │   ┌────┴────┐     │     │  ┌────┴────┐    │
       │            │   │         │     │     │  │         │    │
       │            │ Http    Puppeteer │     │ Json    SQLite  │
       │            └───────────────────┘     └─────────────────┘
       │                    │                         │
       └────────────────────┴─────────────────────────┘
```

| Module | Responsibility |
|--------|----------------|
| `models.js` | Data structures (Config, Statistics) |
| `scraper.js` | Extraction with Strategy pattern (HTTP / Puppeteer) |
| `storage.js` | Persistence with Strategy pattern (JSON / SQLite) |
| `index.js` | Flow orchestration |

## Scraping Mode

### HTTP (default)

```env
SCRAPER_TYPE=http
```

Uses native `fetch` + `cheerio`. Fast and lightweight (~100ms/page).

### Puppeteer

```env
SCRAPER_TYPE=puppeteer
```

Uses headless Chromium browser. Slower (~2-5s/page) but useful for:
- Sites with dynamic JavaScript
- Content that requires rendering
- Avoiding anti-bot detection

## Storage

### JSON (default)

```env
STORAGE_TYPE=json
OUTPUT_FILE=productos.json
```

Generates a JSON file with statistics and products.

### SQLite

```env
STORAGE_TYPE=sqlite
DB_PATH=productos.db
```

Creates `products` and `statistics` tables. Duplicate SKUs are automatically skipped.

```bash
# Query data
sqlite3 productos.db "SELECT sku, name, price FROM products LIMIT 5;"
```

## Limitations

- **Prices**: Only available for products with "Add to Cart" button
- **Rate limiting**: Use delays of 1-3 seconds
- **Pagination**: 24 products per page

## Dependencies

```
better-sqlite3 >= 11.0.0
cheerio >= 1.0.0
dotenv >= 16.0.0
puppeteer >= 23.0.0
```
