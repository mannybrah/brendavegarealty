CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  phase INTEGER NOT NULL,
  title TEXT NOT NULL,
  done_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_checklist_deal ON checklist_items(deal_id, phase, sort_order);
