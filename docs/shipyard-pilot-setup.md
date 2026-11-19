# Shipyard guided discovery and private reviews (pilot)

This branch adds the **next phase** beyond the gallery in PR #28: a working browser-based guided discovery journey and a human-only review queue. It does not yet run an LLM, generate a prototype, send email or publish gallery items. Those are deliberately later phases.

## Routes
- `/shipyard/start/` — public five-step guided experience; works in copy-only preview mode without configuration.
- `GET /api/shipyard/config` — public flag and Turnstile **site key** only.
- `POST /api/shipyard/ideas` — consent-based private intake, requires Turnstile and a dedicated DB.
- `/shipyard/admin/` — static UI; contains no private data unless the API authenticates successfully.
- `GET /api/shipyard/admin/ideas` — identity-gated review queue (up to 100 newest).
- `POST /api/shipyard/admin/review` — identity-gated updates, separate prototype/quote approvals, no delivery.

## Static preview and safe review rehearsal

The public discovery route, `/shipyard/start/`, works without a database: visitors can complete the five steps and copy their brief. The Submit button is disabled until infrastructure and the explicit intake switch are configured.

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
   - `SHIPYARD_TURNSTILE_SITE_KEY` = public Turnstile site key
   - `SHIPYARD_TURNSTILE_SECRET` = matching **secret**, server only
4. Set the Turnstile allowed hostname to `good-ship.co.uk`. Preview deployments with another hostname intentionally remain **copy-only** unless configured separately.
5. Add a WAF/rate-limit rule for public `POST /api/shipyard/ideas`; Turnstile is not a substitute for rate limiting. Confirm the privacy notice, contact/deletion process, regional D1 placement and retention plan before launch. A regular process to purge/archive old enquiries is still needed: **do not claim automated 90-day deletion yet**.
6. Test a real submission with a deliberately fictional organisation and confirm it only appears for an authorised admin. Test invalid Turnstile, malformed data, unauthorised reads and writes, all approval edge cases, and no outbound email.

When a binding is missing, config returns `enabled:false`, submission fails with 503, and the public page still lets the person copy their summary. With Access configuration missing or invalid, all admin endpoints return 403.

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
- The public page is **not** yet LLM-assisted. A future bounded LLM-assisted option should improve questions based on the problem but must never run a build or send a proposal solely from an unreviewed brief.

## Testing
```bash
node --test test/shipyard-intake.test.mjs
node --test test/shipyard-gallery.test.mjs
```
Functional Cloudflare Pages and D1 integration tests still need configured preview bindings. A Netlify static deploy preview does not validate Cloudflare Pages Functions or D1.

## After this phase
1. Human test of discovery questions and admin review ergonomics.
2. Privacy and retention completion; secure test data capture.
3. Optional LLM-assisted question guidance within strict costs and data handling.
4. Bounded sandboxed prototype agent with test summary and immutable artifact versions.
5. Task-based costing, separate price approval and then a separately approved, idempotent delivery outbox.
6. New, better gallery demonstrations; keep them separate from private client enquiries.
