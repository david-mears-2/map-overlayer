# Map Overlayer

Overlay and sum different heatmaps on a map of London, powered by OpenStreetMap data.

## Prerequisites

- Node.js >= 24 (use `nvm use` to switch)
- Playwright browsers: `npx playwright install chromium`

## Setup

```sh
nvm use
npm install
npx playwright install chromium
```

## Development

```sh
npm run dev
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint
- `npm test` — run unit + integration tests (fast, no browser needed)
- `npm run test:watch` — run unit + integration tests in watch mode
- `npm run test:coverage` — run tests with coverage report
- `npm run test:e2e` — run end-to-end tests in Chromium (requires `npm run build` first)

## Testing strategy

There are three test tiers. Run the right ones for the situation:

| Tier | Command | Speed | What it catches | When to run |
|------|---------|-------|-----------------|-------------|
| **Unit** | `npm test` | ~1s | Logic bugs in isolated modules | Every change |
| **Integration** | `npm test` | (included above) | Wiring bugs between modules | Every change |
| **E2e** | `npm run test:e2e` | ~5s | Real browser rendering, canvas, tile loading | Before deploy, after UI/map changes, in CI |

`npm test` runs both unit and integration tests — this is the default you should run after every change. E2e tests require a production build (`npm run build`), so reserve them for when you've changed something that affects the map rendering or data pipeline. The Overpass API is mocked via Playwright's `page.route()` so e2e tests are deterministic and don't require network access.
