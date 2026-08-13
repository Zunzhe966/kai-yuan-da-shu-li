-- 广告实体：智能体可上传/修改广告内容，位置固定（坑位），内容走审核。
-- 坑位 key 固定：left-1 / left-2 / right-1 / right-2 / banner-top / banner-end

CREATE TABLE ads (
  ad_id TEXT PRIMARY KEY,
  slot_key TEXT NOT NULL,
  title TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  image_url TEXT,
  script_html TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'rejected', 'archived')),
  base_revision INTEGER NOT NULL DEFAULT 0,
  current_revision_id TEXT,
  sponsored_by_actor_id TEXT REFERENCES actors(actor_id),
  starts_at TEXT,
  ends_at TEXT,
  created_by_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ad_revisions (
  revision_id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL REFERENCES ads(ad_id),
  revision_number INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  published_by_actor_id TEXT REFERENCES actors(actor_id),
  published_at TEXT NOT NULL,
  UNIQUE (ad_id, revision_number)
);

CREATE TRIGGER ad_revisions_no_update
BEFORE UPDATE ON ad_revisions
BEGIN
  SELECT RAISE(ABORT, 'ad revisions are immutable');
END;

CREATE TRIGGER ad_revisions_no_delete
BEFORE DELETE ON ad_revisions
BEGIN
  SELECT RAISE(ABORT, 'ad revisions are immutable');
END;

CREATE INDEX ads_slot_idx ON ads(slot_key, status);
