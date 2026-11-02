# Machine-readable Good Ship — experiment v0.1

The Good Ship publishes **public site content in HTML and JSON**. Human-facing HTML remains the source of truth.

## Endpoints

- `/site.json` — discovery index, longer positioning summary drawn from homepage copy, audiences, service descriptions, geography, work evidence, other pages, schemas and resource URLs
- `/about.json` — story, location and principles, organisations worked with, contact details
- `/services.json` — six service descriptions
- `/tools.json` — all public tool cards, categories, labels and live URLs
- `/frameworks.json` — open frameworks and their download links
- `/llms.txt` — narrative description intended for AI readers
- `/open-org/*.schema.json` — existing Open Org schema documents (a different standard; left unchanged)

The concise HTML meta description is for search presentation; it deliberately differs from the richer generated `summary` and `positioning` fields used by machine readers. All public claims are backed by the About, Services and work descriptions in the visible homepage. HTML Schema.org Organisation, Person and WebSite entities are linked using stable IDs; this helps clarity but does not guarantee ranking improvements.

Homepage catalogue JSON is generated from `index.html`; individual page JSON is generated from each page's own HTML. No second catalogue or content store is maintained. Collections preserve the current page descriptions, so labels such as "Launching soon" are not silently converted into claims about availability. No unpublished data, account details or backend database content is exposed.

## Individual editorial pages

- `/ai-technology-strategy/page.json` — responsible AI, organisational choice and digital sovereignty
- `/data-strategy/page.json` — useful data, architecture, standards and reporting
- `/organisational-resilience/page.json` — resilient organisational practice and learning

- `/shipyard/page.json` — service offer, delivery approaches and published content
- `/open-org/page.json` — the standard's explanation, sections and links to its JSON schemas
- `/responsible-ai/page.json` — workshop material and curated resources
- `/slow-post/page.json` — participation options and the public sign-up form link

The canonical HTML pages each advertise an `application/json` alternate. The root `/site.json` index links to all four. Machine-readable pages contain the published headings, paragraphs, lists and links, but omit navigation, scripts, decorative SVG and embedded form contents.

Sets is a separate JavaScript application synced from another repository; it has no editorial HTML to extract. It remains listed in the tools catalogue without an invented page export.


## Individual tool and framework records

Every tool in `/tools.json` and every framework in `/frameworks.json` now includes a `json_url` linking to its own static representation. For example:

- `/catalogue/tools/drift.json`
- `/catalogue/tools/open-org.json`
- `/catalogue/frameworks/garden-of-ideas.json`

These records preserve the original text, category or resource links, published labels and source page. They add the collection URL, content type and publisher. They do **not** invent prices, licences, status or ownership claims. The catalogue directories contain generated JSON only; stale records are deleted when their homepage card disappears or is renamed.

The discovery path is `/site.json` → `/tools.json` or `/frameworks.json` → `json_url`. No additional API endpoint is required.

See [`docs/visibility-strategy.md`](visibility-strategy.md) for the distinct priorities of original service pages, proof, measurement and conventional SEO.

## Updating content

Edit the homepage or an editorial subpage as before. Then run:

```sh
node --test test/site-json.test.mjs test/page-json.test.mjs test/item-json.test.mjs test/visibility.test.mjs
node scripts/generate-site-json.mjs
node scripts/generate-page-json.mjs
node scripts/generate-item-json.mjs
```

The GitHub workflow checks all exports on pull requests, and regenerates and commits the JSON when source pages change on main. Pull requests also test the generator. The site remains static: no new framework, database, API keys or server-side request processing is needed.

## Experiment / measurement

Before attributing Open Org requests to real users, classify HTTP requests by path, user agent, status code, bot signals and repeat frequency using Cloudflare request analytics or sampled logs. Plausible browser page views **do not** measure JSON resource fetches.

For the first four weeks, compare:
- Requests and unique referrers for `*.json` routes (excluding existing schemas from the new JSON group).
- Valid JSON 200s versus 404s and errors.
- Human referrals from resources listed in `/tools.json`, where identifiable.
- Agent tasks: can an AI reader accurately list tools, describe services and locate a resource without browsing the HTML?

Do not store raw IPs or full user-agent identifiers longer than necessary. Do not interpret bot request volume alone as meaningful discovery.

## Boundaries

This is **public, read-only content**, not an authenticated API. It does not expose dynamic sponsorship, subscriber, booking or financial data. Open Org remains an independent schema and should not be confused with the site catalogue JSON. URL stability is the goal; breaking changes should be versioned before expanding this experiment.

Potential next steps: Markdown representations, richer provenance metadata and discovery from other organisations' Open Org profiles.
