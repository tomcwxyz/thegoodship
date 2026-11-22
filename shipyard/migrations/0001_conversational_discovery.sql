-- Only for pilot databases where shipyard/schema.sql was applied before
-- conversational discovery was introduced. New installations already have these
-- columns and should apply ONLY shipyard/schema.sql.
ALTER TABLE shipyard_ideas ADD COLUMN conversation_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE shipyard_ideas ADD COLUMN emerging_notes_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE shipyard_ideas ADD COLUMN needs_clarification INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS shipyard_chat_tickets (
  token_hash TEXT PRIMARY KEY,
  issued_epoch INTEGER NOT NULL,
  expires_epoch INTEGER NOT NULL,
  turns_used INTEGER NOT NULL DEFAULT 0,
  last_call_epoch INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_shipyard_chat_expiry ON shipyard_chat_tickets(expires_epoch);
