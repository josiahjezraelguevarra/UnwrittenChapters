CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  drive_folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_file_id TEXT,
  layout TEXT NOT NULL DEFAULT 'masonry',
  theme TEXT NOT NULL DEFAULT 'light',
  brand_name TEXT NOT NULL DEFAULT '',
  brand_url TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  admin_token_hash TEXT NOT NULL,
  allow_download INTEGER NOT NULL DEFAULT 1,
  allow_likes INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  items_json TEXT NOT NULL,
  folders_json TEXT NOT NULL DEFAULT '[]',
  item_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_folder ON galleries(drive_folder_id);

CREATE TABLE IF NOT EXISTS likes (
  gallery_id TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (gallery_id, drive_file_id, visitor_id),
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_likes_gallery ON likes(gallery_id);

CREATE TABLE IF NOT EXISTS abuse_reports (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
);
