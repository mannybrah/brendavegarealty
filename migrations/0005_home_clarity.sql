-- Brenda Vega's Home Clarity: disclosure uploads from the public site.
-- A buyer submits contact details plus one disclosure PDF. The PDF is stored privately in
-- R2 (home-clarity/<id>/disclosure.pdf, never served by the public /media route). Brenda
-- runs the analysis herself and tracks her follow-up here.
--
-- Three independent tracks, on purpose:
--   state           the upload itself (awaiting_upload -> received | expired)
--   report_status   where the disclosure report stands (set by Brenda)
--   contact_status  Brenda's personal follow-up with the buyer
-- reviewed_at is only ever set by an authenticated studio action.

CREATE TABLE hc_intakes (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'awaiting_upload',        -- awaiting_upload | received | expired
  property_address TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'email',      -- email | phone
  agent_status TEXT,                                    -- represented | looking | exploring | NULL (not answered)
  questions TEXT,
  consent_version TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  source_page TEXT,
  utm TEXT,                                             -- JSON, permitted campaign fields only
  file_key TEXT,
  file_name TEXT,
  file_bytes INTEGER,
  file_deleted_at TEXT,
  report_status TEXT NOT NULL DEFAULT 'not_started',    -- not_started | in_progress | ready | sent
  report_url TEXT,
  contact_status TEXT NOT NULL DEFAULT 'new',           -- new | outreach_pending | contacted | walkthrough_scheduled | completed | closed
  reviewed_at TEXT,
  crm_contact_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  received_at TEXT
);
CREATE INDEX idx_hc_intakes_state ON hc_intakes(state, received_at);
CREATE INDEX idx_hc_intakes_email ON hc_intakes(email);

CREATE TABLE hc_notes (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_hc_notes_intake ON hc_notes(intake_id, created_at);

-- Email outbox. One row per (intake, kind) so a retry can never send a second copy.
CREATE TABLE hc_deliveries (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  kind TEXT NOT NULL,                                   -- buyer_receipt | agent_new_request
  status TEXT NOT NULL DEFAULT 'pending',               -- pending | sent | failed | skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  provider_id TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  UNIQUE (intake_id, kind)
);
CREATE INDEX idx_hc_deliveries_status ON hc_deliveries(status);
