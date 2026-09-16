-- Multiple labeled addresses per contact (and per relationship), replacing
-- the single contacts.address column.

CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  relationship_id TEXT,
  label TEXT NOT NULL DEFAULT 'Home',
  address TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_addresses_contact ON addresses(contact_id);

INSERT INTO addresses (id, contact_id, relationship_id, label, address, is_primary, sort_order, created_at)
  SELECT lower(hex(randomblob(16))), id, NULL, 'Home', trim(address), 1, 0, updated_at
  FROM contacts WHERE address IS NOT NULL AND trim(address) <> '';

ALTER TABLE contacts DROP COLUMN address;
