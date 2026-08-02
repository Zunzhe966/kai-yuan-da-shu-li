import type { ProjectPublication } from "../domain/project";

export interface CreatorInput {
  creatorId: string;
  type: "person" | "organization";
  name: string;
  displayName?: string;
  biography?: string;
  aliases?: string[];
  officialSites?: string[];
  socialProfiles?: CreatorSocialProfile[];
  codeHostIdentities?: string[];
}

export interface CreatorSocialProfile {
  platform: string;
  url: string;
  handle?: string;
}

export interface CreatorProfile {
  creatorId: string;
  type: "person" | "organization";
  name: string;
  displayName: string;
  biography: string;
  aliases: string[];
  officialSites: string[];
  socialProfiles: CreatorSocialProfile[];
  codeHostIdentities: string[];
}

export interface ProjectRole {
  creatorId: string;
  role: ProjectPublication["attribution"][number]["role"];
}

export interface CreatorProject {
  projectId: string;
  role: ProjectRole["role"];
  evidenceIds: string[];
  project: ProjectPublication;
}

export interface ExternalRepository {
  platform: string;
  platformRepositoryId: string;
  fullName: string;
  canonicalUrl: string;
  summary: string;
  observedAt: string;
}

export interface CreatorDetail extends CreatorProfile {
  projects: CreatorProject[];
  unreviewedRepositories: ExternalRepository[];
}

interface CreatorRow {
  creator_id: string;
  creator_type: CreatorProfile["type"];
  name: string;
  display_name: string;
  biography: string;
  aliases_json: string;
  official_sites_json: string;
  social_profiles_json: string;
  code_host_identities_json: string;
}

function parseJsonArray<T>(value: string): T[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function toCreatorProfile(row: CreatorRow): CreatorProfile {
  return {
    creatorId: row.creator_id,
    type: row.creator_type,
    name: row.name,
    displayName: row.display_name,
    biography: row.biography,
    aliases: parseJsonArray<string>(row.aliases_json),
    officialSites: parseJsonArray<string>(row.official_sites_json),
    socialProfiles: parseJsonArray<CreatorSocialProfile>(row.social_profiles_json),
    codeHostIdentities: parseJsonArray<string>(row.code_host_identities_json),
  };
}

export async function upsertCreator(
  db: D1Database,
  creator: CreatorInput,
): Promise<void> {
  const timestamp = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO creators (
        creator_id, creator_type, name, display_name, biography,
        aliases_json, official_sites_json, social_profiles_json,
        code_host_identities_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(creator_id) DO UPDATE SET
        creator_type = excluded.creator_type,
        name = excluded.name,
        display_name = excluded.display_name,
        biography = excluded.biography,
        aliases_json = excluded.aliases_json,
        official_sites_json = excluded.official_sites_json,
        social_profiles_json = excluded.social_profiles_json,
        code_host_identities_json = excluded.code_host_identities_json,
        updated_at = excluded.updated_at`,
    )
    .bind(
      creator.creatorId,
      creator.type,
      creator.name,
      creator.displayName ?? creator.name,
      creator.biography ?? "",
      JSON.stringify(creator.aliases ?? []),
      JSON.stringify(creator.officialSites ?? []),
      JSON.stringify(creator.socialProfiles ?? []),
      JSON.stringify(creator.codeHostIdentities ?? []),
      timestamp,
      timestamp,
    )
    .run();
}

const CREATOR_COLUMNS = `
  creator_id, creator_type, name, display_name, biography,
  aliases_json, official_sites_json, social_profiles_json,
  code_host_identities_json`;

export async function searchCreators(
  db: D1Database,
  query = "",
  limit = 24,
): Promise<CreatorProfile[]> {
  const normalized = query.trim().toLocaleLowerCase();
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const result = await db
    .prepare(
      `SELECT ${CREATOR_COLUMNS}
       FROM creators
       WHERE ? = ''
          OR instr(lower(name), ?) > 0
          OR instr(lower(display_name), ?) > 0
          OR instr(lower(aliases_json), ?) > 0
          OR instr(lower(code_host_identities_json), ?) > 0
       ORDER BY display_name COLLATE NOCASE, creator_id
       LIMIT ?`,
    )
    .bind(normalized, normalized, normalized, normalized, normalized, boundedLimit)
    .all<CreatorRow>();
  return result.results.map(toCreatorProfile);
}

export async function getCreator(
  db: D1Database,
  creatorId: string,
): Promise<CreatorProfile | null> {
  const row = await db
    .prepare(`SELECT ${CREATOR_COLUMNS} FROM creators WHERE creator_id = ?`)
    .bind(creatorId)
    .first<CreatorRow>();
  return row ? toCreatorProfile(row) : null;
}

export async function listCreatorIds(db: D1Database): Promise<string[]> {
  const result = await db
    .prepare("SELECT creator_id FROM creators ORDER BY creator_id")
    .all<{ creator_id: string }>();
  return result.results.map((row) => row.creator_id);
}

export async function getCreatorDetail(
  db: D1Database,
  creatorId: string,
): Promise<CreatorDetail | null> {
  const creator = await getCreator(db, creatorId);
  if (!creator) {
    return null;
  }

  const projectRows = await db
    .prepare(
      `SELECT roles.project_id, roles.role, roles.evidence_ids_json, revisions.document_json
       FROM creator_project_roles roles
       JOIN projects ON projects.project_id = roles.project_id
       JOIN project_revisions revisions ON revisions.revision_id = projects.current_revision_id
       WHERE roles.creator_id = ?
       ORDER BY projects.name COLLATE NOCASE, roles.role`,
    )
    .bind(creatorId)
    .all<{
      project_id: string;
      role: CreatorProject["role"];
      evidence_ids_json: string;
      document_json: string;
    }>();
  const repositoryRows = await db
    .prepare(
      `SELECT platform, platform_repository_id, full_name, canonical_url, summary, observed_at
       FROM creator_external_repositories
       WHERE creator_id = ?
       ORDER BY full_name COLLATE NOCASE`,
    )
    .bind(creatorId)
    .all<{
      platform: string;
      platform_repository_id: string;
      full_name: string;
      canonical_url: string;
      summary: string;
      observed_at: string;
    }>();

  return {
    ...creator,
    projects: projectRows.results.map((row) => ({
      projectId: row.project_id,
      role: row.role,
      evidenceIds: parseJsonArray<string>(row.evidence_ids_json),
      project: JSON.parse(row.document_json) as ProjectPublication,
    })),
    unreviewedRepositories: repositoryRows.results.map((row) => ({
      platform: row.platform,
      platformRepositoryId: row.platform_repository_id,
      fullName: row.full_name,
      canonicalUrl: row.canonical_url,
      summary: row.summary,
      observedAt: row.observed_at,
    })),
  };
}

export async function replaceProjectRoles(
  db: D1Database,
  projectId: string,
  attribution: ProjectPublication["attribution"],
): Promise<void> {
  const statements = [
    db
      .prepare("DELETE FROM creator_project_roles WHERE project_id = ?")
      .bind(projectId),
    ...attribution.map((item) =>
      db
        .prepare(
          `INSERT INTO creator_project_roles (
            creator_id, project_id, role, evidence_ids_json
          ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          item.creator_id,
          projectId,
          item.role,
          JSON.stringify(item.evidence_ids),
        ),
    ),
  ];
  await db.batch(statements);
}

export async function listProjectRoles(
  db: D1Database,
  projectId: string,
): Promise<ProjectRole[]> {
  const result = await db
    .prepare(
      `SELECT creator_id, role FROM creator_project_roles
       WHERE project_id = ? ORDER BY creator_id, role`,
    )
    .bind(projectId)
    .all<{ creator_id: string; role: ProjectRole["role"] }>();
  return result.results.map((row) => ({
    creatorId: row.creator_id,
    role: row.role,
  }));
}
