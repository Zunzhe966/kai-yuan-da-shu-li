CREATE TABLE pending_repository_claims (
  claim_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_repository_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  draft_id TEXT NOT NULL REFERENCES drafts(draft_id),
  created_at TEXT NOT NULL,
  released_at TEXT
);

CREATE UNIQUE INDEX pending_repository_claims_active_identity
  ON pending_repository_claims(platform, platform_repository_id)
  WHERE released_at IS NULL;

CREATE UNIQUE INDEX pending_repository_claims_active_draft
  ON pending_repository_claims(draft_id)
  WHERE released_at IS NULL;
