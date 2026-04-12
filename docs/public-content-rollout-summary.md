# Public Content Rollout Summary

Date: 2026-04-12

## Implemented

- Moved runtime share storage out of the Git working tree via `DATA_DIR` / `.runtime`
- Added curated publication manifest: [data/public-scenarios.json](/Users/vasilijklimov/Documents/Codex project/data/public-scenarios.json)
- Added stable public scenario pages:
  - `/scenario/<slug>`
- Added archive page:
  - `/scenarios`
- Added server-rendered scenario/article HTML before JavaScript hydration
- Added self-canonical metadata for public pages
- Added `noindex,follow` for temporary share URLs (`?s=` / `?scenario=`)
- Added redirect from old public short links to new canonical scenario URLs
- Added internal discovery blocks:
  - related scenarios
  - recent scenarios
  - popular scenarios
- Added archive taxonomy filters:
  - country
  - era
  - theme
  - tone
- Updated dynamic sitemap to include archive and public scenarios only
- Added publication statuses:
  - `draft`
  - `share-only`
  - `public`
- Added quality gate for `public` scenarios
- Added CLI publication flow:
  - `npm run review:scenario -- --share-id <id>`
  - `npm run publish:scenario -- --share-id <id> ...`

## Content workflow

- runtime `share-links.json` remains the storage for generated/shareable scenario payloads
- `data/public-scenarios.json` is now the publication gate
- `draft` entries do not get a route and do not appear in archive/sitemap
- `share-only` entries get a clean `/scenario/<slug>` URL, but stay `noindex,follow`
- Only entries present in `public-scenarios.json` with `status: "public"` are:
  - included in the archive
  - included in `sitemap.xml`
- If an entry claims `status: "public"` but fails the quality gate, the server downgrades it out of the public archive automatically

## Validation completed locally

- runtime storage now resolves from `.runtime/` by default and can be moved to `/root/butterfly-runtime` on VPS
- Homepage HTML has archive-oriented metadata
- `/scenarios` returns crawlable archive HTML
- `/scenario/rossiya-ne-prodala-alyasku` returns scenario-specific title, canonical and body copy
- `/?s=FopiMOU` redirects to `/scenario/rossiya-ne-prodala-alyasku`
- Temporary share URLs still render and are now `noindex,follow`
- Filtered archive pages are `noindex,follow` and canonically collapse to `/scenarios`
- `sitemap.xml` contains public scenario routes

## Next sensible step

- Add analytics events for:
  - generation started
  - generation completed
  - archive page viewed
  - scenario page viewed
  - donation clicked
  - Telegram clicked
