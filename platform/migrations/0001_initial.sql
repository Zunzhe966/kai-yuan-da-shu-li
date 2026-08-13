PRAGMA foreign_keys = ON;

CREATE TABLE actors (
  actor_id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'agent', 'service')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  primary_platform TEXT NOT NULL,
  primary_platform_repository_id TEXT NOT NULL,
  name TEXT NOT NULL,
  chinese_name TEXT,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  current_revision_id TEXT,
  current_revision_number INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (primary_platform, primary_platform_repository_id)
);

CREATE TABLE project_revisions (
  revision_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  revision_number INTEGER NOT NULL,
  schema_version TEXT NOT NULL CHECK (schema_version = 'project-publication-v1'),
  document_json TEXT NOT NULL,
  content_hash TEXT,
  published_by_actor_id TEXT REFERENCES actors(actor_id),
  published_at TEXT NOT NULL,
  UNIQUE (project_id, revision_number)
);

CREATE TRIGGER project_revisions_no_update
BEFORE UPDATE ON project_revisions
BEGIN
  SELECT RAISE(ABORT, 'project revisions are immutable');
END;

CREATE TRIGGER project_revisions_no_delete
BEFORE DELETE ON project_revisions
BEGIN
  SELECT RAISE(ABORT, 'project revisions are immutable');
END;

CREATE TABLE repository_sources (
  repository_source_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  platform TEXT NOT NULL,
  platform_repository_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary', 'component', 'mirror', 'archive')),
  metadata_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  UNIQUE (platform, platform_repository_id)
);

CREATE INDEX repository_sources_project_idx ON repository_sources(project_id);

CREATE TABLE project_search_facets (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  facet_type TEXT NOT NULL,
  facet_value TEXT NOT NULL,
  PRIMARY KEY (project_id, facet_type, facet_value)
);

CREATE INDEX project_search_facets_lookup_idx
  ON project_search_facets(facet_type, facet_value, project_id);

CREATE VIRTUAL TABLE projects_fts USING fts5(
  project_id UNINDEXED,
  name,
  aliases,
  summary,
  use_when,
  avoid_when,
  section_text,
  tokenize = 'unicode61'
);

CREATE TABLE creators (
  creator_id TEXT PRIMARY KEY,
  creator_type TEXT NOT NULL CHECK (creator_type IN ('person', 'organization')),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  biography TEXT NOT NULL DEFAULT '',
  current_revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE creator_revisions (
  revision_id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creators(creator_id),
  revision_number INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (creator_id, revision_number)
);

CREATE TABLE creator_project_roles (
  creator_id TEXT NOT NULL REFERENCES creators(creator_id),
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  role TEXT NOT NULL CHECK (role IN ('creator', 'current_owner', 'maintainer', 'organization', 'foundation', 'sponsor_of_upstream')),
  evidence_ids_json TEXT NOT NULL,
  PRIMARY KEY (creator_id, project_id, role)
);

CREATE INDEX creator_project_roles_project_idx
  ON creator_project_roles(project_id, role);

CREATE TABLE evidence (
  evidence_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  revision_id TEXT NOT NULL REFERENCES project_revisions(revision_id),
  url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  document_json TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  PRIMARY KEY (project_id, revision_id, evidence_id)
);

CREATE TABLE creation_tickets (
  ticket_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_repository_id TEXT NOT NULL,
  issued_to_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  UNIQUE (platform, platform_repository_id, issued_to_actor_id, expires_at)
);

CREATE TABLE drafts (
  draft_id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'stale', 'archived')),
  base_revision INTEGER NOT NULL DEFAULT 0,
  document_json TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  updated_by_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE submissions (
  submission_id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(draft_id),
  submitted_by_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'high')),
  submitted_at TEXT NOT NULL
);

CREATE TABLE reviews (
  review_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(submission_id),
  reviewer_actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  decision TEXT NOT NULL CHECK (decision IN ('changes_requested', 'approved')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE change_reports (
  report_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  report_type TEXT NOT NULL,
  upstream_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'verifying', 'needs_review', 'applied', 'rejected', 'retry')),
  evidence_url TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, report_type, upstream_fingerprint)
);

CREATE TABLE api_credentials (
  credential_id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(actor_id),
  token_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (actor_id, token_hash)
);

CREATE TABLE audit_events (
  audit_event_id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES actors(actor_id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  diff_json TEXT,
  evidence_ids_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX audit_events_target_idx
  ON audit_events(target_type, target_id, created_at);

CREATE TABLE backup_runs (
  backup_run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  revision_watermark TEXT,
  manifest_key TEXT,
  manifest_hash TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
