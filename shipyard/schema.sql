-- Shipyard private enquiry database (Cloudflare D1). A SEPARATE database/binding
-- from the Good Ship sponsorship ledger. Apply to a new D1 database:
--   npx wrangler d1 execute good-ship-shipyard --remote --file=./shipyard/schema.sql
-- Bind it to the Pages project as SHIPYARD_DB in the appropriate environment.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shipyard_ideas (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL,
  organisation TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL,
  people TEXT NOT NULL DEFAULT '',
  current_approach TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL,
  conversation_json TEXT NOT NULL DEFAULT '[]',
  emerging_notes_json TEXT NOT NULL DEFAULT '{}',
  needs_clarification INTEGER NOT NULL DEFAULT 0,
  direction TEXT NOT NULL,
  priority TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'new'
    CHECK(state IN ('new','reviewing','needs_detail','declined','internally_approved')),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shipyard_ideas_created ON shipyard_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipyard_ideas_state ON shipyard_ideas(state,created_at DESC);

CREATE TABLE IF NOT EXISTS shipyard_reviews (
  idea_id TEXT PRIMARY KEY REFERENCES shipyard_ideas(id) ON DELETE CASCADE,
  review_version INTEGER NOT NULL DEFAULT 0,
  prototype_url TEXT NOT NULL DEFAULT '',
  prototype_notes TEXT NOT NULL DEFAULT '',
  ship_it_pence INTEGER,
  learn_ship_pence INTEGER,
  quote_notes TEXT NOT NULL DEFAULT '',
  private_notes TEXT NOT NULL DEFAULT '',
  prototype_approved_version INTEGER,
  quote_approved_version INTEGER,
  prototype_approved_by TEXT,
  quote_approved_by TEXT,
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS shipyard_audit (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES shipyard_ideas(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_shipyard_audit_idea ON shipyard_audit(idea_id,at DESC);
-- No delivery or publication table in this phase; nothing can be emailed or made public.

-- Short-lived, anonymous usage tickets for LLM-assisted discovery. No conversation
-- content or personal identity is stored here before the person submits an idea.
CREATE TABLE IF NOT EXISTS shipyard_chat_tickets (
  token_hash TEXT PRIMARY KEY,
  issued_epoch INTEGER NOT NULL,
  expires_epoch INTEGER NOT NULL,
  turns_used INTEGER NOT NULL DEFAULT 0,
  last_call_epoch INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_shipyard_chat_expiry ON shipyard_chat_tickets(expires_epoch);
