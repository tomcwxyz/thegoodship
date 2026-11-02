# The Good Ship — search and AI discovery plan

Updated: 2 November 2026

## Positioning

The Good Ship is a North East England-based consultancy, practical product studio and open research practice serving charities, social enterprises, community businesses, foundations and other mission-driven teams, including organisations outside the UK. The site's public copy already supports the key specialisms: AI and technology strategy, data strategy and architecture, organisational resilience, product and team development, learning partnerships and open infrastructure.

A useful proposition to test across pages:

> Strategy, useful technology and open infrastructure for organisations working for social good. Think clearly, make things that work and build the capability to keep going.

**This is an editorial proposal, not a replacement for approved public copy.** Adapt it to the founder's voice before publishing more prominent claims.

## What matters most

Search visibility depends on individual, useful, indexed HTML pages, an intelligible site structure, technical crawlability and genuine independent references. The static JSON feeds are good for agents and reuse, but Google does not require them for AI Overviews or AI Mode. Avoid trying to manipulate rankings with synthetic keywords or invented endorsements.

### Priority 1 — clear, distinct service pages

Develop four substantial, internally linked landing pages, each with a specific audience and problem:

1. **Responsible AI and technology sovereignty for social purpose organisations** — realistic decisions, policies, risk, training, ownership and avoiding unnecessary lock-in. Link to Responsible AI workshop, Bearing, Sets and relevant examples.
2. **Data strategy and architecture for charities and foundations** — deciding what to collect, using data well, standards, open reporting and maps; link to relevant public tools and work.
3. **Organisational resilience and strategic decision-making** — purpose, money, people, governance and adapting to uncertainty; link to the resilience toolkit and published facilitation methods.
4. **Bespoke tools and organisational software** — strengthen the existing /shipyard/ page with real examples and frequently asked questions rather than make a duplicate page.

Each page should answer: who this is for, the problem it addresses, what the work looks like, what the client gets, how work is delivered, how it differs from generic vendors, and how to start a conversation. Use specific original examples and practical learning; avoid unsubstantiated performance claims. Where possible add links to live open tools, resources and articles.

### Priority 2 — useful proof

Publish **two or three short, consented examples of practice** with the challenge, constraints, what was actually done, what changed and what remains uncertain. Obtain permission before naming an organisation or publishing figures. Where no client case can be published, use a clearly labelled example of an openly developed product or practice instead.

Develop a coherent founder/about story with experience, approach, public talks, workshops and the open work. Keep name, organisation identity and URLs consistent across the site, public professional profiles and relevant directories.

### Priority 3 — questions people ask

Build pages around real questions that prospective users and clients bring, not generic keyword articles. Candidates:

- What does a responsible AI policy for a charity need to cover?
- When should a small charity build software instead of buying another subscription?
- How do we know whether an organisational resilience plan is actually useful?
- How can charities use open data without collecting more than they need?
- How do we design a simple data standard shared across organisations?

Each answer should include reasoning, examples, author attribution, date, and links to the most relevant service or resource. For genuinely new content, add unique descriptive titles, canonical URLs and sitemap entries.

## Technical discovery

- Homepage: specific title, concise meta description and readable main content.
- Publish a connected Schema.org Organisation / Person / WebSite graph with evidence-backed specialisms and no made-up local address or reviews.
- Keep /site.json as a **discovery index** with a separate in-depth summary, audiences, services, founder, geographic scope and evidence generated from visible HTML.
- Maintain valid canonical links, internal links, robots.txt and the sitemap of **canonical HTML pages**. Use accurate last-modified dates only when they are reliably maintained.
- Prefer linking tools and frameworks from relevant descriptive HTML; standalone JSON is complementary, not a substitute.
- Do not claim a specific North East office, local trading address, customer reviews, qualifications or measurable outcomes without evidence.
- If an eligible Google Business Profile exists, make sure the service area reflects where the business genuinely works. Do not fabricate a storefront or publish a home address.

## Measuring whether it works

Set up or verify Google Search Console and Bing Webmaster Tools for good-ship.co.uk. Capture a baseline before major content changes: pages indexed, queries, search impressions, click-through rate, branded versus non-branded discovery, referring pages and contact enquiries. Monitor crawl errors and important URLs.

For AI visibility, periodically test a small reproducible set of real user questions in major AI assistants and record whether The Good Ship is found, cited accurately or confused with another entity. Distinguish **crawling**, **citation**, **visits** and **qualified enquiries**; they are different signals.

For Cloudflare, record HTTP hits and response statuses for site.json, catalogue JSON and schema paths separately from ordinary HTML; a crawler hitting a JSON file does not prove that it cited or recommended the company.

Review over 30, 60 and 90 days. Prioritise evidence of relevant visitors and conversations, not raw bot traffic.

## Useful sources

- Google Search Central — AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central — organisation markup: https://developers.google.com/search/docs/appearance/structured-data/organization
- Google Search Central — site names: https://developers.google.com/search/docs/appearance/site-names

## Immediate implemented foundation

The homepage now states the consultancy/build/open research combination in visible copy and links to Shipyard and Open Org. The search description is shorter and more specific. Organisation, founder and website entities are connected in Schema.org, and site.json exposes richer positioning extracted from About and Services. The sitemap includes Slow Post and no longer contains misleading hard-coded modification dates.

### Service-content implementation

Three original service guides are now implemented: `/ai-technology-strategy/`, `/data-strategy/` and `/organisational-resilience/`. Shipyard now answers build-versus-buy and maintenance questions. Homepage service cards, sitemap, `llms.txt` and page-level JSON point to these pages. The guides include genuine FAQs and links to open products or frameworks; they do not claim unverified outcomes.

**Still outstanding:** permissioned case studies and testimonials, real search-query research, relevant independent references, and Search Console/Bing performance baselines. See `docs/case-study-intake.md` for what to collect. Revisit pages when qualitative evidence arrives rather than fabricating 'social proof'.
