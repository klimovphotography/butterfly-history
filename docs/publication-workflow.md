# Publication Workflow

Date: 2026-04-12

## What changed

The project no longer relies on manual JSON edits alone to decide what becomes public content.

Scenario publication now has three statuses:

- `draft`
  - not routable
  - not in archive
  - not in sitemap
- `share-only`
  - routable at `/scenario/<slug>`
  - `noindex,follow`
  - useful for private review or hand-picked sharing
- `public`
  - routable at `/scenario/<slug>`
  - included in archive
  - included in sitemap
  - eligible for indexing

## Quality gate

`public` now requires a minimum content quality bar.

Current checks:

- clean `slug`
- title is not too short
- narrative is long enough for a standalone page
- at least 3 meaningful paragraphs
- summary and description are not too thin
- at least one country/region
- era is set
- at least one theme

If a manifest entry requests `status: "public"` but does not pass the gate:

- it is not allowed to behave like a public archive page
- the server automatically downgrades it out of the public archive

## CLI flow

Review a share-link payload before writing anything:

```bash
npm run review:scenario -- --share-id FopiMOU
```

Publish a scenario as `public`:

```bash
npm run publish:scenario -- --share-id FopiMOU --status public --country Россия --era "XIX век" --theme геополитика --theme империи --featured
```

Create a clean non-indexed review page:

```bash
npm run publish:scenario -- --share-id FopiMOU --status share-only
```

## Notes

- share payloads still live in `.runtime/share-links.json` locally or `DATA_DIR/share-links.json` on VPS
- publication metadata lives in `data/public-scenarios.json`
- this split keeps runtime generation storage separate from curated archive state
