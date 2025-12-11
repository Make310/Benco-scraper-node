# Benco Dental Web Scraper

Scraper para extraer productos de [shop.benco.com](https://shop.benco.com).

> Este proyecto fue desarrollado inicialmente en **Python** utilizando `requests` y `BeautifulSoup`, y posteriormente migrado a **Node.js** con `fetch` nativo y `cheerio`.
>
> Repositorio: [github.com/Make310/Benco-scraper](https://github.com/Make310/Benco-scraper)

## Requisitos

- Node.js >= 18.0.0

## Datos Extraídos

| Campo | Descripción |
|-------|-------------|
| `sku` | Identificador único del producto |
| `name` | Nombre del producto |
| `price` | Precio (cuando está disponible) |
| `availability` | Estado de stock / fecha de envío |
| `brand` | Marca del fabricante |
| `product_category` | Categoría del producto |
| `image_url` | URL de la imagen |
| `product_url` | URL del producto |
| `rating` | Calificación promedio |
| `review_count` | Número de reviews |

## Instalación

```bash
npm install
```

## Configuración

Editar el archivo `.env`:

```env
# Categoría a scrapear (nombre exacto del sitio)
CATEGORY_NAME=Acrylics & Relines

# Páginas a scrapear (0 = todas)
MAX_PAGES=2

# Delay entre peticiones (segundos)
MIN_DELAY=1
MAX_DELAY=3

# Tipo de scraper: http o puppeteer
SCRAPER_TYPE=http

# Tipo de almacenamiento: json o sqlite
STORAGE_TYPE=json

# Salida JSON (cuando STORAGE_TYPE=json)
OUTPUT_FILE=productos.json

# Base de datos SQLite (cuando STORAGE_TYPE=sqlite)
DB_PATH=productos.db
```

### Categorías de ejemplo

- `Acrylics & Relines`
- `Alloy`
- `Anesthetic`
- `Articulating`

> El nombre debe coincidir exactamente con el sitio web.

## Ejecución

```bash
npm run scrape
```

### Salida esperada

```
==================================================
BENCO DENTAL SCRAPER
==================================================
Categoría: Acrylics & Relines
Max páginas: 2
Delay: 1.0-3.0s
Scraper: HTTP
==================================================

[Página 1/2]
  Categoría: Acrylics and Relines
  Total en sitio: 1353 productos (57 páginas)
  Detectados: 24 | Guardados: 24 | Omitidos: 0
  Esperando 2.3s...
[Página 2/2]
  Detectados: 24 | Guardados: 24 | Omitidos: 0

Guardado en: productos.json

==================================================
ESTADÍSTICAS DE LA CORRIDA
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

## Estructura del Proyecto

```
test_scraping_node/
├── src/
│   ├── index.js       # Orquestador principal
│   ├── scraper.js     # Extracción de datos (BencoScraper)
│   ├── storage.js     # Persistencia (JSON / SQLite)
│   └── models.js      # Modelos de datos
├── data/              # Directorio para archivos generados
├── .env               # Configuración
├── .gitignore         # Archivos ignorados
├── package.json       # Dependencias
└── README.md
```

## Arquitectura

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

| Módulo | Responsabilidad |
|--------|-----------------|
| `models.js` | Estructuras de datos (Config, Statistics) |
| `scraper.js` | Extracción con patrón Strategy (HTTP / Puppeteer) |
| `storage.js` | Persistencia con patrón Strategy (JSON / SQLite) |
| `index.js` | Orquestación del flujo |

## Modo de Scraping

### HTTP (default)

```env
SCRAPER_TYPE=http
```

Usa `fetch` nativo + `cheerio`. Rápido y ligero (~100ms/página).

### Puppeteer

```env
SCRAPER_TYPE=puppeteer
```

Usa navegador Chromium headless. Más lento (~2-5s/página) pero útil para:
- Sitios con JavaScript dinámico
- Contenido que requiere renderizado
- Evadir detección anti-bot

## Almacenamiento

### JSON (default)

```env
STORAGE_TYPE=json
OUTPUT_FILE=productos.json
```

Genera un archivo JSON con estadísticas y productos.

### SQLite

```env
STORAGE_TYPE=sqlite
DB_PATH=productos.db
```

Crea tablas `products` y `statistics`. Los SKUs duplicados se omiten automáticamente.

```bash
# Consultar datos
sqlite3 productos.db "SELECT sku, name, price FROM products LIMIT 5;"
```

## Limitaciones

- **Precios**: Solo disponibles para productos con botón "Add to Cart"
- **Rate limiting**: Usar delays de 1-3 segundos
- **Paginación**: 24 productos por página

## Dependencias

```
better-sqlite3 >= 11.0.0
cheerio >= 1.0.0
dotenv >= 16.0.0
puppeteer >= 23.0.0
```
