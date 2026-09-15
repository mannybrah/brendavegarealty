-- CRM v2: dynamic stages, real tags, relationships, multi phone/email,
-- contact detail fields, editable/starred timeline, task types.

CREATE TABLE stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
INSERT INTO stages (id, name, description, color, sort_order, is_system, created_at) VALUES
  ('new',               'New',               'Not spoken to yet (default for new leads)',  'gold',  0, 1, '2026-09-14T00:00:00.000Z'),
  ('attempted_contact', 'Attempted Contact', 'Trying to reach by call, text, or email',    'coral', 1, 0, '2026-09-14T00:00:00.000Z'),
  ('contacted',         'Contacted',         'Spoken with, not met yet',                    'steel', 2, 0, '2026-09-14T00:00:00.000Z'),
  ('appointment_set',   'Appointment Set',   'Meeting scheduled',                           'plum',  3, 0, '2026-09-14T00:00:00.000Z'),
  ('active',            'Active',            'Touring, listing, or writing offers',         'teal',  4, 1, '2026-09-14T00:00:00.000Z'),
  ('nurture',           'Nurture',           'Not ready yet. Stay in touch',               'sage',  5, 0, '2026-09-14T00:00:00.000Z'),
  ('under_contract',    'Under Contract',    'Offer accepted',                              'amber', 6, 1, '2026-09-14T00:00:00.000Z'),
  ('closed',            'Closed',            'Deal closed',                                 'green', 7, 1, '2026-09-14T00:00:00.000Z'),
  ('sphere',            'Sphere / Past',     'Past clients, friends, and family',           'stone', 8, 0, '2026-09-14T00:00:00.000Z'),
  ('archived',          'Trash',             'No longer working with',                      'gray',  9, 1, '2026-09-14T00:00:00.000Z');

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);
CREATE TABLE contact_tags (
  contact_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (contact_id, tag_id)
);
CREATE INDEX idx_contact_tags_tag ON contact_tags(tag_id);

INSERT OR IGNORE INTO tags (id, name, created_at)
  SELECT lower(hex(randomblob(16))), name, '2026-09-14T00:00:00.000Z'
  FROM (SELECT DISTINCT trim(j.value) AS name FROM contacts c, json_each(c.tags) j WHERE trim(j.value) <> '');
INSERT OR IGNORE INTO contact_tags (contact_id, tag_id, created_at)
  SELECT c.id, t.id, '2026-09-14T00:00:00.000Z'
  FROM contacts c, json_each(c.tags) j
  JOIN tags t ON t.name = trim(j.value) COLLATE NOCASE
  WHERE trim(j.value) <> '';
ALTER TABLE contacts DROP COLUMN tags;

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_relationships_contact ON relationships(contact_id);

CREATE TABLE phones (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  relationship_id TEXT,
  number TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'mobile',
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_bad INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_phones_number ON phones(number);
CREATE INDEX idx_phones_contact ON phones(contact_id);

CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  relationship_id TEXT,
  address TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'personal',
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_bad INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_emails_address ON emails(address);
CREATE INDEX idx_emails_contact ON emails(contact_id);

INSERT INTO phones (id, contact_id, relationship_id, number, label, is_primary, is_bad, sort_order, created_at)
  SELECT lower(hex(randomblob(16))), id, NULL, phone, 'mobile', 1, 0, 0, created_at FROM contacts WHERE phone IS NOT NULL AND phone <> '';
INSERT INTO emails (id, contact_id, relationship_id, address, label, is_primary, is_bad, sort_order, created_at)
  SELECT lower(hex(randomblob(16))), id, NULL, email, 'personal', 1, 0, 0, created_at FROM contacts WHERE email IS NOT NULL AND email <> '';

ALTER TABLE contacts ADD COLUMN price INTEGER;
ALTER TABLE contacts ADD COLUMN timeframe TEXT;
ALTER TABLE contacts ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN last_communication_at TEXT;
UPDATE contacts SET last_communication_at = (
  SELECT MAX(e.created_at) FROM events e WHERE e.contact_id = contacts.id AND e.kind IN ('call','text','email')
);

ALTER TABLE events ADD COLUMN updated_at TEXT;
ALTER TABLE events ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN outcome TEXT;

ALTER TABLE tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'follow_up';
UPDATE tasks SET type = 'call' WHERE title LIKE 'Respond to %';
