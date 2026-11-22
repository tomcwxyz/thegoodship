# Shipyard guided discovery and private reviews (pilot)

This pilot now uses a **conversation-first** entry inspired by ImpactPath's natural follow-up and behind-the-scenes structured capture. It includes an optional, bounded LLM guide behind an explicit disabled-by-default configuration switch and a human-only review queue. It does **not** generate a prototype, calculate a quote, send email or publish gallery items.

## Routes
- `/shipyard/start/` — conversational idea exploration, editable emerging notes and copyable brief. When AI isn't configured, a plainly labelled offline guide demonstrates the interaction without pretending to be an LLM.
- `GET /api/shipyard/conversation/config` — availability and public Turnstile site key only.
- `POST /api/shipyard/conversation/start` — bot-verified anonymous, short-lived session ticket.
- `POST /api/shipyard/conversation/message` — capped AI follow-up using limited conversation history and grounded note updates; no persistence of the conversation at this stage.
- `GET /api/shipyard/config` — public flag and Turnstile **site key** only.
- `POST /api/shipyard/ideas` — consent-based private intake, requires Turnstile and a dedicated DB.
- `/shipyard/admin/` — static UI; contains no private data unless the API authenticates successfully.
- `GET /api/shipyard/admin/ideas` — identity-gated review queue (up to 100 newest).
- `POST /api/shipyard/admin/review` — identity-gated updates, separate prototype/quote approvals, no delivery.

## Static preview and safe review rehearsal

The public discovery route, `/shipyard/start/`, works without a database: visitors can talk through an idea using a clearly labelled offline conversational preview, correct emerging notes and copy their brief. It is not a live AI assistant when the API is disabled. The submission option remains disabled until intake configuration and the explicit intake switch are enabled.

Reviewers can also open `/shipyard/admin/?demo=1` **on a static preview** to rehearse the dashboard with three fictional enquiries using `.test` email addresses. Demo mode:
- intercepts review API requests locally and never calls the network;
- supports saving costs, approving the prototype, approving the quote and marking an idea internally approved;
- clears approvals if a saved draft changes and rejects stale versions;
- persists nothing, sends no messages and never exposes actual client data;
- resets completely when the page is reloaded.

The production admin URL without `?demo=1` remains protected by the server-side Access JWT requirement. Protect the admin paths themselves with Cloudflare Access before launch.

## Setup before live public intake

**Do not enable public submissions** until the review access and retention processes have been tested.

1. Create a new Cloudflare D1 database (separate from `good-ship-ledger`):
   ```bash
   npx wrangler d1 create good-ship-shipyard
   npx wrangler d1 execute good-ship-shipyard --remote --file=./shipyard/schema.sql
   ```
   Bind it to the Good Ship Cloudflare Pages project as **`SHIPYARD_DB`**, in production and in any test environment that needs to accept ideas. Do not bind the production DB to previews.
2. Create a Cloudflare Zero Trust **Access application** covering both `good-ship.co.uk/shipyard/admin/*` and `good-ship.co.uk/api/shipyard/admin/*`, allowing only the named admin(s). Deny everyone else. The API also verifies the Access JWT (RS256 signature, audience, issuer, validity and exact email allowlist) on every request; the Access policy on both paths is defence in depth.
3. Configure these Pages environment variables:
   - `SHIPYARD_ACCESS_TEAM_DOMAIN` = full fixed team issuer, e.g. `https://YOUR-TEAM.cloudflareaccess.com`
   - `SHIPYARD_ACCESS_AUD` = the Access application Audience Tag (the app protecting API calls; configure both paths consistently)
   - `SHIPYARD_ADMIN_EMAILS` = comma-separated exact allowed admin email addresses
   - `SHIPYARD_CONVERSATION_ENABLED` = `false` until the live LLM pilot is approved; this is an independent switch from enquiry submissions
   - `SHIPYARD_CHAT_API_KEY` = server-side OpenAI API credential (secret, never in client code)
   - `SHIPYARD_CHAT_MODEL` = configured JSON-mode model, e.g. `gpt-4o-mini`
   - `SHIPYARD_TURNSTILE_SITE_KEY` = public Turnstile site key
   - `SHIPYARD_TURNSTILE_SECRET` = matching **secret**, server only
4. Set the Turnstile allowed hostname to `good-ship.co.uk`. Preview deployments with another hostname intentionally remain **copy-only** unless configured separately.
5. Add a WAF/rate-limit rule for public `POST /api/shipyard/ideas`; Turnstile is not a substitute for rate limiting. Confirm the privacy notice, contact/deletion process, regional D1 placement and retention plan before launch. A regular process to purge/archive old enquiries is still needed: **do not claim automated 90-day deletion yet**.
6. Test a real submission with a deliberately fictional organisation and confirm it only appears for an authorised admin. Test invalid Turnstile, malformed data, unauthorised reads and writes, all approval edge cases, and no outbound email.

When a binding is missing, config returns `enabled:false`, submission fails with 503, and the public page still lets the person copy their summary. With Access configuration missing or invalid, all admin endpoints return 403.

## Activation checklist — Cloudflare and genuine model testing

The conversation code is on **draft PR #29**, not on `main`. Configuring production Pages bindings does not deploy a draft GitHub branch, and the Netlify preview has no Cloudflare Pages Functions. Do not infer that a Netlify preview showing the conversational UI has confirmed an OpenAI connection.

### Safe test-first approach

1. In **Workers & Pages → Good Ship project → Deployments**, find a **Cloudflare Pages preview deployment** of `feat/shipyard-intake-private-review`. If the branch was not deployed, check the Pages project's Git integration and preview branch controls. The Netlify `deploy-preview-29` is **not** this preview.
2. For a Cloudflare preview, bind a **separate, empty D1 test database** to `SHIPYARD_DB` in the **Preview** environment, and initialise it with `shipyard/schema.sql`. Do not reuse the production `good-ship-shipyard` database for preview traffic.
3. Configure the **Preview** environment with `SHIPYARD_TURNSTILE_SITE_KEY`, `SHIPYARD_TURNSTILE_SECRET`, `SHIPYARD_CHAT_API_KEY` (encrypted), `SHIPYARD_CHAT_MODEL=gpt-4o-mini`, `SHIPYARD_CHAT_DAILY_LIMIT=20`, `SHIPYARD_CONVERSATION_ENABLED=true` and `SHIPYARD_INTAKE_ENABLED=false`.
4. In Turnstile, add **the exact Cloudflare preview hostname** shown in Deployments to the widget's permitted hostnames. Use a separate Turnstile widget for the preview if preferred. Turnstile tokens are checked against the request's exact hostname. Avoid permissive wildcard hostnames. Restrict preview access with Cloudflare Access when collecting real information; use fictional test cases until privacy checks are complete.
5. Redeploy the **Cloudflare preview**, then open `https://<your-cloudflare-preview-host>/api/shipyard/conversation/config`. Expect `{"enabled":true,...}` and a public `siteKey`. If `enabled:false`, check the **Preview** environment variables and D1 binding, not the production ones.
6. Open the same preview's `/shipyard/start/`. It should say **AI-assisted conversation**, request Turnstile verification and respond with contextual questions. Test multiple messages, correcting a note, early review/copy, provider failures and exhaustion of the session quota. Do not enable intake yet. The `/api/shipyard/config` endpoint should still return `enabled:false`.
7. Test the daily cap with `SHIPYARD_CHAT_DAILY_LIMIT=2` in a temporary isolated preview and verify the third model call returns 429 without a provider request; return the Preview limit to 20. CI executes this scenario using real SQLite.
8. Before enabling real submissions, configure Cloudflare Access admin protection, human review permissions, WAF per-IP limits, privacy/deletion arrangements, and a separately approved retention policy. Then test a consented fictitious submission and verify it is visible only in the admin queue.
9. Only after Cloudflare end-to-end testing, decide whether to merge PR #29 into `main`. **Production must keep `SHIPYARD_CONVERSATION_ENABLED=false` and `SHIPYARD_INTAKE_ENABLED=false` until explicitly approved for a public pilot.**

### AI cost and abuse controls

The chat endpoint limits each anonymous Turnstile-verified session to 14 calls within 45 minutes, and applies a **shared D1-backed model-call budget per UTC day**. `SHIPYARD_CHAT_DAILY_LIMIT` defaults to **120** successful budget allocations/day, clamped to 500. Set a smaller value (e.g. 20) for previews. This is a **request cap, not a monetary cap**; also set a provider-side spend budget and configure Cloudflare WAF rate limits for `POST /api/shipyard/conversation/start`, `POST /api/shipyard/conversation/message` and `POST /api/shipyard/ideas`. The daily counter uses reserved entries in `shipyard_chat_tickets`, so there is **no additional schema migration**. The ephemeral ticket rows are cleared opportunistically on creating a new ticket. All model calls remain disabled if the `SHIPYARD_CONVERSATION_ENABLED` flag is not exactly `true`.

The CI suite executes `test/shipyard-sqlite-integration.test.mjs` against the shipped schema and checks shared quota enforcement, genuine database inserts and long consented conversation transcripts. This verifies source compatibility, **not** that Cloudflare production services or keys have been deployed.

## Conversation behaviour and the ImpactPath pattern

**Conversation first, structured brief second.** The model acknowledges what the person actually said, asks one useful follow-up, allows non-build options to emerge and quietly captures five provisional aspects: the problem, people affected, current approach, desired outcome and constraints. It should skip questions already answered, ask for real examples when vague, and help people correct its misunderstandings. The visitor can stop and review the brief at any point; **there is no visible five-stage form or completion percentage**.

The optional AI service uses a fixed server-side prompt, a configured OpenAI chat-completions model returning JSON, and a grounded patch rule: each newly captured statement must be accompanied by an actual quotation from the person's latest message. Anything without a matching quotation is discarded. Even grounded summaries are only **provisional**; the person can edit them and the reviewer sees the underlying transcript. An AI response cannot trigger any delivery.

**Abuse and privacy boundaries:** A Cloudflare Turnstile check creates an anonymous ticket in the dedicated D1 database, storing only a SHA-256 token hash, issue/expiry timestamps and counters — **not the conversation text**. Ticket validity lasts 45 minutes with a maximum 14 model calls, a shared daily model-call limit, and a minimum interval enforced atomically by D1. Expired tickets are pruned when new tickets are issued. Add Cloudflare WAF rate limits by source and application; the ticket limit alone does not protect against repeated ticket creation. The browser sends a limited rolling transcript to the model; no chat is stored as an enquiry until the visitor explicitly consents and submits the review form. The review request then stores the capped transcript and provisional notes in the private Shipyard D1 tables so the human reviewer has their words and context.

For an existing pilot database created before conversational capture, apply `shipyard/migrations/0001_conversational_discovery.sql` **instead of** rerunning the full schema. New databases use only `shipyard/schema.sql`. Confirm that privacy notices, provider terms, retention/deletion arrangements, source-IP rate limiting and data-subject rights are in place **before enabling** either live AI or intake.

**Not a live production service yet:** The static Netlify preview can demonstrate the conversation and notes UI but not the Cloudflare Pages Functions. Validate the API against a staging Cloudflare Pages deployment with its own D1 binding and Turnstile hostname before putting real people through it.

## How approvals work

- A reviewer saves a prototype URL, notes, and indicative Ship It / Learn & Ship costs in pounds. The server stores **pence**, not floating-point prices.
- Saving draft fields increments `review_version` and clears **both** approvals. A stale editor receives a 409 on review updates.
- `approve_prototype` requires a saved HTTPS preview and an explicit human confirmation.
- `approve_quote` requires a positive saved cost and saved pricing assumptions plus an explicit confirmation.
- `internally_approved` is permitted only when both approvals match the current `review_version`.
- Nothing triggers delivery. There is no sender, delivery queue, mail provider or public gallery publishing route in this phase. Approval is *internal*, not permission to send.
- Before integrating an AI worker, store immutable build identifiers, tests and a cryptographic artifact digest. Future release must verify the exact reviewed artifact and recipient, and require **an additional distinct delivery approval**. Gallery publishing needs separate consent and approval.

## Safety and limits
- No client documents, real referrals or sensitive data should be included in pilot ideas.
- We store only structured text and contacts, plus submission consent timestamp. There is no file-upload or payment handling here.
- The server rejects cross-origin JSON posts, oversized payloads, missing consent, invalid fields and invalid Turnstile submissions. It returns no sensitive data to unauthorised clients.
- Admin API performs independent JWT verification rather than trusting any client-supplied email or role.
- The public page uses text content rather than unsafe HTML insertion.
- The LLM-assisted conversation endpoint is implemented but gated off; it must never run a build, create a binding estimate or send a proposal based on an unreviewed brief.

## Testing
```bash
node --test test/shipyard-intake.test.mjs test/shipyard-routes.test.mjs test/shipyard-demo.test.mjs test/shipyard-conversation.test.mjs
node --test test/shipyard-gallery.test.mjs
```
Functional Cloudflare Pages and D1 integration tests still need configured preview bindings. A Netlify static deploy preview does not validate Cloudflare Pages Functions or D1.

## After this phase
1. Human test of discovery questions and admin review ergonomics.
2. Privacy and retention completion; secure test data capture.
3. Test the already implemented (but disabled) LLM-assisted dialogue in a protected Cloudflare staging environment, with the provider, limits, safeguards and transcript handling verified.
4. Bounded sandboxed prototype agent with test summary and immutable artifact versions.
5. Task-based costing, separate price approval and then a separately approved, idempotent delivery outbox.
6. New, better gallery demonstrations; keep them separate from private client enquiries.
