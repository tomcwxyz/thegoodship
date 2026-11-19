# Shipyard: ideas to working tools
## Initial delivery specification — 19 November 2026

### Positioning
Shipyard is a guided route from a real-world problem to an appropriate working tool, **not** a general-purpose AI application generator. It must be allowed to recommend an improved process, an existing product, a spreadsheet or an integration rather than custom development.

Two distinct commissioned routes remain:
- **Ship It:** Good Ship designs, builds, tests, deploys and hands over.
- **Learn & Ship:** a team builds alongside Good Ship, with coaching and review; do not assume this is cheaper.

### What is in this branch
- A new public gallery at /shipyard/gallery/ with three **fictional** locally interactive demonstrations and three links to actual publicly available tools.
- Updated Shipyard page with a clearer idea-to-tool proposition and links to demonstrations.
- This specification for the future private intake, background build, review and delivery flow.
- **There is no live enquiry ingestion, AI agent, pricing service, approval console or outbound-email automation in this branch.** The gallery is intentionally safe to publish before those features exist.

### Non-negotiable human approval contract
**No enquirer-facing prototype link, costing, proposal, progress email or other outbound email leaves Shipyard without the owner's explicit release approval.** An on-screen submission confirmation is allowed. A future email-verification or receipt flow needs a separately agreed exception, not a silent bypass.

Reviewing price and reviewing the prototype are **separate gates**. A completed release requires:
1. Reviewer has opened and checked the exact immutable prototype version, build/test summary, sample-data provenance and security notes.
2. Reviewer has checked or edited the exact quote version. Quotes must contain assumptions, exclusions, VAT treatment, indicative versus fixed status, hosting and maintenance estimates, and *both* Ship It and Learn & Ship where applicable.
3. Reviewer has explicitly approved **delivery** of those exact versions to that exact recipient.
4. Sender rechecks project, email, recipient, artifact IDs, version hashes and active approval at send time. Any edit invalidates approval. Any re-run creates a new version for review.
5. Delivery is idempotent, audited and never triggered simply because an agent completed successfully.

Gallery publication is a **different** consent and approval from delivery to the enquirer. Publishing requires explicit permission from the idea owner (where relevant), personal-data review, fictional/anonymised data and the owner's separate gallery approval. Default is PRIVATE / not featured.

### Proposed data model
Store the workflow in a dedicated database, not in the public sponsorship ledger.

```text
shipyard_ideas
  id, contact_email, organisation_name?, original_description, consent_at,
  state, created_at, updated_at, retention_due_at
shipyard_briefs
  id, idea_id, version, structured_brief_json, recommended_approach, created_at
shipyard_runs
  id, idea_id, brief_version, state, sandbox_id, budget_cap_gbp,
  estimated_spend_gbp, finished_at, failure_reason
shipyard_prototypes
  id, idea_id, run_id, version, immutable_artifact_hash,
  private_preview_url, test_summary_json, review_status, reviewed_by, reviewed_at
shipyard_quotes
  id, idea_id, version, currency, vat_treatment,
  ship_it_json, learn_and_ship_json, assumptions_json, review_status,
  reviewed_by, reviewed_at
shipyard_releases
  id, idea_id, prototype_id, quote_id, recipient_email, content_hash,
  approved_by, approved_at, status, sent_at, mail_provider_id,
  unique (idea_id, content_hash, recipient_email)
shipyard_gallery
  id, idea_id?, prototype_id?, title, description, publication_consent_at?,
  sanitisation_status, admin_approved_by?, admin_approved_at?, published_at?
shipyard_audit_log
  id, idea_id, actor_id, action, artifact_version?, metadata_json, created_at
```

Use server-side authenticated admin roles, strict authorisation on every action and audit trail; never treat a client-provided admin flag as authority. Use immutable artifact versions and restrict private previews with authorisation and expiration rather than relying on guessable links.

### Workflow states
```text
submitted
  -> discovery_review -> build_queued -> generating -> ready_for_review
  -> changes_requested -> build_queued / quote_revised -> ready_for_review
  -> approved_for_delivery -> delivery_queued -> sent
  -> declined (owner decision)
```
A task can fail or expire without sending. Transitions must be transactionally checked on the server. Agents may update drafts but cannot approve or release them.

### Review console: must-have information
For each idea show:
- Original question and AI summary; uncertainty, missing decisions and non-build alternatives.
- Prototype preview (desktop/mobile), test and security notes, logs and generated code link.
- Editable quote alongside effort breakdown, risks, hosting, support, VAT and two ways of working.
- Internal comments and 'request revision' control.
- Separately labelled **Approve prototype**, **Approve quote**, **Release to enquirer**, and **Consider for public gallery** controls.
- A confirmation screen displaying the intended email recipient and the exact versions to send.

Pricing must be estimated from an explicit task-based model with configurable day rate, complexity allowances and risk contingency. An LLM may suggest tasks and assumptions but cannot silently choose a binding price. Start with indicative ranges unless the owner changes them.

### Build and security boundaries
- Run untrusted/generated code in an isolated, short-lived sandbox. No client secrets, production databases, shared volumes or arbitrary network access.
- Set per-run limits on tokens, duration, compute, model spend, file count and retry attempts; stop rather than loop endlessly.
- Only synthetic data in initial prototypes. Do not accept uploads or live integrations in v1.
- Require build, smoke tests, basic accessibility and security checks. Present failures for manual review; do not pretend a broken build is a successful prototype.
- Avoid arbitrary live third-party URLs inside demonstrations.
- Rate-limit public intake and apply bot protection, data minimisation, consent language, retention schedule and deletion mechanism before accepting user submissions.

### Gallery policy
- First wave: real public products (clearly described as working products) plus separate small fictional interactive demonstrations.
- Later: user-specific generated prototypes remain private until **separate** opt-in and a sanitised new public artifact has been approved.
- Every gallery item should distinguish 'sample demonstration', 'existing product' and eventually 'commissioned / published with permission'.
- Eventually add 'Use this as a starting point' to prefill the discovery brief without exposing another user's private prompt or data.

### Suggested next implementation sequence
1. Review initial gallery content and presentation; deploy only after approval.
2. Build guided discovery with a structured brief and manual triage queue, initially **without** any automated sender.
3. Build private admin review console and version-based approval checks, with tests that prove unapproved content cannot be sent.
4. Integrate a sandboxed prototype worker with a small bounded component/template repertoire.
5. Add task-based pricing and editable dual-option quotes, then the delivery outbox and email provider.
6. Only then consider automatic processing at scale.

### Minimum negative tests before first real enquirer
- Agent completes: no email.
- Only prototype approved: no email.
- Only quote approved: no email.
- Both approved but delivery not explicitly approved: no email.
- Artifact/quote/recipient edited after approval: no email.
- Non-admin attempting approval: rejected.
- Retry after delivery: no duplicate email.
- Gallery consent absent or revoked: no public publication.
- Preview link guessed or expired: denied.
- Sandbox fails tests or exceeds budget: no release.
