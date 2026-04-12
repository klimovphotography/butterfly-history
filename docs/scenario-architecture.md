# Scenario Architecture Baseline

Date: 2026-04-12

## Current stack

- Runtime: plain `Node.js` HTTP server
- Entry point: [server.mjs](/Users/vasilijklimov/Documents/Codex project/server.mjs)
- Frontend: static HTML/CSS/JS from `public/`
- Rendering mode: server serves `public/index.html` and injects metadata/bootstrap values
- Scenario storage: file-based JSON store in runtime data directory
  - local default: `.runtime/share-links.json`
  - production: `DATA_DIR/share-links.json`
  - legacy path still supported for migration: `data/share-links.json`

## How scenario pages work today

1. The generator sends `POST /api/alt-history`.
2. The client builds a compact scenario payload in the browser and asks `POST /api/share-link` for a short link.
3. The server stores the encoded payload in runtime storage under a short id.
4. Shared URLs use `/?s=<shortId>`.
5. On page load the server resolves `?s=` to the stored payload and injects it into `window.__SCENARIO_PAYLOAD__`.
6. Then [public/app.js](/Users/vasilijklimov/Documents/Codex project/public/app.js) hydrates the scenario into the chat UI on the client.

There is also a raw payload mode via `?scenario=<base64url-payload>`, but the main share flow uses `?s=`.

## Why canonical/meta behavior was weak for SEO

- Public scenario content did not have stable clean URLs like `/scenario/<slug>`.
- Scenario pages reused the homepage HTML shell and only swapped metadata for query URLs.
- The sitemap only contained static HTML files from `public/`, so it listed the homepage but not real scenario content.
- As a result, the project behaved more like a one-page generator with share links than a crawlable content library.

## Content model before the refactor

- `share-links.json` in runtime storage is the source of truth for temporary/shareable scenarios.
- Every record contains:
  - `scenario`: base64url JSON payload
  - `createdAt`: ISO timestamp
- Decoded payload fields typically include:
  - `lang`
  - `event`
  - `mode`
  - `title`
  - `subtitle`
  - `narrative`

## Refactor direction

The new public content layer should keep the existing share flow, but add:

- a manual publication manifest for curated scenarios
- stable public routes
- archive/discovery pages
- self-canonical public pages
- sitemap entries only for intentionally published content
