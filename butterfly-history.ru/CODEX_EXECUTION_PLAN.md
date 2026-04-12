# Codex Execution Plan For butterfly-history.ru

## Purpose

Actual source-code root for this project:

- `/Users/vasilijklimov/Documents/Codex project`

This copy of the plan is stored inside the `butterfly-history.ru` notes folder for convenience, but implementation work should start from the real project root above.

This file is a working plan for a future Codex session.
The goal is not to explain theory, but to help Codex make the project materially stronger for:

- search traffic
- repeat visits
- monetization via Yandex ad network and donations
- product clarity

The project is currently promising as an AI product, but weak as a monetizable content site.
The biggest gap is this:

- right now the site behaves mostly like a single-page AI generator
- to monetize well, it needs to become a hybrid:
  - AI generator
  - public library of high-quality alternative-history pages
  - searchable archive with internal linking

## Important Context

Based on the live audit on 2026-04-12:

- Main site: `https://butterfly-history.ru/`
- The generator works and creates shareable result pages with query-based URLs like `?s=...`
- The site has working meta tags, `robots.txt`, `sitemap.xml`, Yandex Metrika, and decent technical quality
- Lighthouse snapshot:
  - performance: `0.75`
  - accessibility: `1.00`
  - best practices: `0.92`
  - seo: `1.00`
- Main structural SEO problem:
  - generated scenario pages currently use canonical `/`
  - this likely prevents them from becoming proper search pages
- Main business problem:
  - the site has too little indexable content structure
  - monetization via ads is weak if the project stays a mostly one-page tool

## Rule Zero

Before changing anything:

1. Find the real source code repository.
2. Confirm that the current working directory contains the code, not only notes/docs.
3. If this folder only contains planning files, locate the actual app source first.
4. Do not guess framework or hosting setup without checking the codebase.

If the codebase is not present here, stop and ask the user to open the real source folder.

## Main Goal

Transform `butterfly-history.ru` from a single interactive generator into a content platform where strong generated scenarios become indexable landing pages that can:

- rank in search
- attract internal clicks
- support future Yandex ad placements
- increase trust and donation conversion

## Success Criteria

The work should move the project toward these outcomes:

- each public scenario has its own stable, clean URL
- each public scenario can self-index and is not canonically collapsed into the homepage
- the site has archive pages and internal linking
- the sitemap includes real content pages
- metadata for scenario pages is meaningful and specific
- there is a clear split between:
  - private/temporary generations
  - public/indexable high-quality pages
- monetization is prepared but not forced too early

## What Not To Do

- Do not add Yandex ads immediately just because monetization is a goal.
- Do not index every low-quality AI generation.
- Do not create a spammy archive of weak pages.
- Do not treat technical SEO score as proof of business viability.
- Do not break the current generator UX while improving content architecture.

## Priority Order

Follow this order unless the codebase proves a better sequence is needed.

### Phase 1. Establish Baseline And Find Architecture

Tasks:

- inspect the codebase and identify:
  - framework
  - routing system
  - rendering mode
  - metadata generation
  - sitemap generation
  - analytics integration
  - scenario storage model
- verify how `?s=...` works:
  - is it session-based
  - database-backed
  - URL-decoded payload
  - share token
- document the current content model

Deliverable:

- a short technical note in the repo describing how scenario pages are currently generated and why canonical/meta behavior is happening

Stop and ask the user only if:

- the real source code is missing
- production data source is inaccessible
- route generation depends on secrets or infrastructure not present locally

### Phase 2. Fix Public Scenario Page SEO Foundations

This is the highest-value implementation phase.

Tasks:

- introduce a stable public route for published scenarios
  - preferred shape: `/scenario/<slug>`
  - exact naming can follow project conventions
- separate temporary sessions from public pages
  - temporary sessions can still exist
  - published/indexable scenarios must have stable routes
- for public scenario pages:
  - set self-canonical
  - generate unique title
  - generate strong meta description
  - generate correct `og:title`
  - generate correct `og:description`
  - generate correct `og:url`
  - generate useful structured data if appropriate
- ensure homepage canonical stays correct
- ensure public scenario pages return proper server-rendered HTML or crawlable content

Acceptance criteria:

- opening a public scenario page in raw HTML shows scenario-specific title and description
- canonical points to the page itself, not homepage
- the page is useful even before JavaScript hydrates

### Phase 3. Build A Real Content Graph

Without this, the site remains weak for monetization.

Tasks:

- create at least one archive page, for example:
  - `/scenarios`
- add internal discovery blocks:
  - related scenarios
  - recent scenarios
  - popular scenarios
  - similar era/topic scenarios
- define a basic taxonomy for filtering or grouping:
  - by country
  - by century/era
  - by theme
  - by tone/mode
- expose links between pages so search engines and users can browse deeper

Acceptance criteria:

- a user can land on one scenario page and naturally reach 3 to 5 more pages
- the sitemap and internal links reflect actual content depth

### Phase 4. Add Quality Gate For Public Scenarios

This protects the site from becoming AI sludge.

Tasks:

- define what qualifies a scenario for public/indexable status
- add a publication state such as:
  - draft
  - share-only
  - public
- do not auto-index everything
- if the codebase allows:
  - add a simple editorial scoring or moderation step
  - add minimum content-quality checks
  - reject trivial or broken generations from public archive

Suggested quality signals:

- clear title
- meaningful subtitle/year
- coherent narrative
- sufficient text length
- no obvious hallucination garbage formatting
- no empty or repetitive output

Acceptance criteria:

- only intentionally published scenarios enter archive and sitemap

### Phase 5. Improve Conversion Toward Donations

Right now donation exists, but it is too generic.

Tasks:

- move donation prompts closer to moments of delight
  - after a strong generated result
  - after export/share action
- rewrite donation copy to feel product-connected, not passive
- test lighter CTA variants such as:
  - support new visuals
  - help unlock better models
  - sponsor public archive growth
- keep the donation block trustworthy and non-aggressive
- consider adding social proof later if real usage appears

Acceptance criteria:

- donation ask feels like a natural continuation of value received
- the page still feels like a product, not a beg screen

### Phase 6. Prepare For Ads, But Only After Content Depth Exists

This is a preparation phase, not immediate ad insertion.

Tasks:

- review Yandex ad network requirements before implementation
- prepare legal/support pages if missing:
  - privacy policy
  - contacts
  - about project
- identify safe ad placement candidates:
  - archive pages
  - long public scenario pages
  - not the core generator interaction path
- avoid placing ads where they interrupt generation flow

Important:

- do not treat ad insertion as phase 1
- ads should come after:
  - real archive depth
  - stable crawlable pages
  - some measurable traffic

Acceptance criteria:

- monetization plan is technically ready, but ad UX does not degrade the core product

### Phase 7. Strengthen Analytics For Real Decisions

Tasks:

- verify Yandex Metrika loads reliably
- audit whether important events are tracked:
  - generation started
  - generation completed
  - share clicked
  - PNG opened/exported
  - donation clicked
  - Telegram clicked
  - archive page viewed
  - scenario page viewed
- if analytics are weak, fix tracking before ad experiments

Acceptance criteria:

- there is enough behavioral data to understand where users drop off and what creates value

## Suggested Concrete Deliverables

Future Codex should try to leave the project with these artifacts if possible:

- implemented stable public scenario route
- fixed canonical and metadata logic
- implemented scenario archive page
- implemented internal related-links block
- updated sitemap logic
- updated analytics events
- added or improved support pages if missing
- short implementation summary in markdown

## Recommended Working Sequence Inside The Repo

Use this exact workflow:

1. Read codebase structure.
2. Identify routing and metadata implementation.
3. Reproduce current canonical/meta behavior for homepage and scenario page.
4. Implement stable public scenario route.
5. Fix metadata and canonical.
6. Add archive page and related links.
7. Update sitemap generation.
8. Validate with browser and raw HTML checks.
9. Only then touch monetization-related UI.

## Validation Checklist

Before declaring success, verify:

- homepage still works
- generation flow still works
- temporary sharing still works if it existed before
- at least one public scenario page renders correctly
- public page title is unique
- public page description is meaningful
- public page canonical is correct
- sitemap contains public content pages
- archive page links to scenarios
- scenario pages link back into the site
- mobile layout is still usable

## If Time Is Limited

If only one focused implementation chunk can be done, do this:

1. Create stable public scenario pages.
2. Remove homepage canonical from those pages.
3. Add scenario-specific metadata.
4. Include them in sitemap.

This is the single biggest leverage point for both SEO and future monetization.

## Notes For Future Codex

- The owner is a beginner and prefers very simple explanations.
- Do the work instead of giving long theory where possible.
- Be honest about tradeoffs.
- If the repo does not contain the actual source code, say so clearly and help locate it.

## Final Objective

The correct target is not:

- "make the homepage more SEO"

The correct target is:

- "turn the product into a searchable content engine with a strong generator at its core"

That is the path with the highest chance of future ad revenue and meaningful donations.
