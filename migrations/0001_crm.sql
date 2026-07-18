CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  type TEXT,
  stage TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);
CREATE INDEX idx_contacts_stage ON contacts(stage);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  meta TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_contact ON events(contact_id, created_at);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  deal_id TEXT,
  milestone_id TEXT,
  title TEXT NOT NULL,
  due_at TEXT,
  done_at TEXT,
  notified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE done_at IS NULL;

CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  side TEXT NOT NULL,
  property_address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  target_close_date TEXT,
  portal_token TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom',
  date TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  client_visible INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminded_day_before TEXT,
  reminded_day_of TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_milestones_deal ON milestones(deal_id, sort_order);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_ok_at TEXT
);
