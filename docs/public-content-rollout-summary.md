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

## Content workflow

- runtime `share-links.json` remains the storage for generated/shareable scenario payloads
- `data/public-scenarios.json` is now the publication gate
- Only entries present in `public-scenarios.json` with `status: "public"` are:
  - routable at `/scenario/<slug>`
  - included in the archive
  - included in `sitemap.xml`

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

- Add a lightweight editorial UI or CLI to promote a share-link entry into `public-scenarios.json` without manual JSON editing.
