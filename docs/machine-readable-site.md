# Machine-readable Good Ship — experiment v0.1

The Good Ship publishes **public site content in HTML and JSON**. Human-facing HTML remains the source of truth.

## Endpoints

- `/site.json` — discovery index, other pages, schemas and resource URLs
- `/about.json` — story, location and principles, organisations worked with, contact details
- `/services.json` — six service descriptions
- `/tools.json` — all public tool cards, categories, labels and live URLs
- `/frameworks.json` — open frameworks and their download links
- `/llms.txt` — narrative description intended for AI readers
- `/open-org/*.schema.json` — existing Open Org schema documents (a different standard; left unchanged)

Each JSON file is generated automatically from `index.html`, to avoid maintaining a second set of content. Collections preserve the current page descriptions, so labels such as "Launching soon" are not silently converted into claims about availability. No unpublished data, account details or backend database content is exposed.

## Updating content

Edit the homepage as before. Then run:

```sh
node --test test/site-json.test.mjs
node scripts/generate-site-json.mjs
node scripts/generate-page-json.mjs
```

The GitHub workflow regenerates and commits JSON on pushes to main or the `feat/machine-readable-site-json` branch. Pull requests also test the generator. The site remains static: no new framework, database, API keys or server-side request processing is needed.

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

Potential next steps: public articles and subpages, per-item tool JSON, Markdown representations and discovery from other organisations' Open Org profiles.
