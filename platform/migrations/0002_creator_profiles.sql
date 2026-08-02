ALTER TABLE creators ADD COLUMN aliases_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE creators ADD COLUMN official_sites_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE creators ADD COLUMN social_profiles_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE creators ADD COLUMN code_host_identities_json TEXT NOT NULL DEFAULT '[]';

CREATE INDEX creators_name_idx ON creators(name COLLATE NOCASE, creator_id);

CREATE TABLE creator_external_repositories (
  creator_id TEXT NOT NULL REFERENCES creators(creator_id),
  platform TEXT NOT NULL,
  platform_repository_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  observed_at TEXT NOT NULL,
  PRIMARY KEY (creator_id, platform, platform_repository_id)
);

CREATE INDEX creator_external_repositories_creator_idx
  ON creator_external_repositories(creator_id, full_name);
