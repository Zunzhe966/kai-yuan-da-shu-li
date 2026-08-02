import { SECTION_KEYS, type ProjectPublication } from "../domain/project";

export interface InsertRevisionResult {
  projectId: string;
  revisionId: string;
  revision: number;
}

export interface StoredRevision {
  revisionId: string;
  projectId: string;
  revision: number;
  documentJson: string;
  publishedAt: string;
}

interface RevisionRow {
  revision_id: string;
  project_id: string;
  revision_number: number;
  document_json: string;
  published_at: string;
}

function toStoredRevision(row: RevisionRow): StoredRevision {
  return {
    revisionId: row.revision_id,
    projectId: row.project_id,
    revision: row.revision_number,
    documentJson: row.document_json,
    publishedAt: row.published_at,
  };
}

function facetEntries(document: ProjectPublication): Array<[string, string]> {
  const discovery = document.discovery;
  const groups: Array<[string, string[]]> = [
    ["domain", discovery.domains],
    ["subcategory", discovery.subcategories],
    ["task", discovery.tasks],
    ["capability", discovery.capabilities],
    ["project_type", discovery.project_types],
    ["language", discovery.languages],
    ["framework", discovery.frameworks],
    ["runtime", discovery.runtimes],
    ["protocol", discovery.protocols],
    ["delivery_method", discovery.delivery_methods],
    ["package_format", discovery.package_formats],
    ["operating_system", discovery.operating_systems],
    ["runtime_target", discovery.runtime_targets],
    ["natural_language", discovery.natural_languages],
    ["license", discovery.licenses],
  ];
  return groups.flatMap(([type, values]) =>
    values.map((value) => [type, value] as [string, string]),
  );
}

export async function insertRevision(
  db: D1Database,
  document: ProjectPublication,
  publishedByActorId: string | null = null,
): Promise<InsertRevisionResult> {
  const primary =
    document.repository_sources.find((source) => source.role === "primary") ??
    document.repository_sources[0];
  if (!primary) {
    throw new Error("A project revision requires a repository source");
  }

  const existingRepository = await db
    .prepare(
      "SELECT project_id FROM repository_sources WHERE platform = ? AND platform_repository_id = ?",
    )
    .bind(primary.platform, primary.platform_repository_id)
    .first<{ project_id: string }>();
  if (existingRepository && existingRepository.project_id !== document.project_id) {
    throw new Error("Repository identity is already linked to another project");
  }

  const revision = document.publication.revision;
  const revisionId = `${document.project_id}:r${revision}`;
  const publishedAt = document.publication.published_at ?? new Date().toISOString();
  const documentJson = JSON.stringify(document);
  const sectionText = SECTION_KEYS.map((key) => {
    const section = document.sections[key];
    return `${section.summary}\n${section.body}\n${section.key_points.join("\n")}`;
  }).join("\n");

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO projects (
          project_id, primary_platform, primary_platform_repository_id,
          name, chinese_name, summary, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id) DO NOTHING`,
      )
      .bind(
        document.project_id,
        primary.platform,
        primary.platform_repository_id,
        document.card.name,
        document.card.chinese_name,
        document.card.summary,
        document.card.maintenance_status,
        publishedAt,
        publishedAt,
      ),
    db
      .prepare(
        `INSERT INTO project_revisions (
          revision_id, project_id, revision_number, schema_version,
          document_json, published_by_actor_id, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        revisionId,
        document.project_id,
        revision,
        document.schema_version,
        documentJson,
        publishedByActorId,
        publishedAt,
      ),
    db
      .prepare(
        `UPDATE projects SET
          name = ?, chinese_name = ?, summary = ?, status = ?,
          current_revision_id = ?, current_revision_number = ?, updated_at = ?
        WHERE project_id = ?`,
      )
      .bind(
        document.card.name,
        document.card.chinese_name,
        document.card.summary,
        document.card.maintenance_status,
        revisionId,
        revision,
        publishedAt,
        document.project_id,
      ),
    db
      .prepare("DELETE FROM project_search_facets WHERE project_id = ?")
      .bind(document.project_id),
    db.prepare("DELETE FROM projects_fts WHERE project_id = ?").bind(document.project_id),
    db
      .prepare(
        `INSERT INTO projects_fts (
          project_id, name, aliases, summary, use_when, avoid_when, section_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        document.project_id,
        document.card.name,
        document.identity.aliases.join(" "),
        document.card.summary,
        document.card.use_when,
        document.card.avoid_when,
        sectionText,
      ),
  ];

  for (const source of document.repository_sources) {
    statements.push(
      db
        .prepare(
          `INSERT INTO repository_sources (
            repository_source_id, project_id, platform, platform_repository_id,
            canonical_url, full_name, role, metadata_json, observed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(platform, platform_repository_id) DO UPDATE SET
            canonical_url = excluded.canonical_url,
            full_name = excluded.full_name,
            role = excluded.role,
            metadata_json = excluded.metadata_json,
            observed_at = excluded.observed_at`,
        )
        .bind(
          `${source.platform}:${source.platform_repository_id}`,
          document.project_id,
          source.platform,
          source.platform_repository_id,
          source.canonical_url,
          source.full_name,
          source.role,
          JSON.stringify(source),
          source.observed_at,
        ),
    );
  }

  for (const [type, value] of facetEntries(document)) {
    statements.push(
      db
        .prepare(
          "INSERT INTO project_search_facets (project_id, facet_type, facet_value) VALUES (?, ?, ?)",
        )
        .bind(document.project_id, type, value),
    );
  }

  for (const item of document.evidence) {
    statements.push(
      db
        .prepare(
          `INSERT INTO evidence (
            evidence_id, project_id, revision_id, url, source_type,
            document_json, retrieved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          item.evidence_id,
          document.project_id,
          revisionId,
          item.url,
          item.source_type,
          JSON.stringify(item),
          item.retrieved_at,
        ),
    );
  }

  await db.batch(statements);
  return { projectId: document.project_id, revisionId, revision };
}

export async function listRevisions(
  db: D1Database,
  projectId: string,
): Promise<StoredRevision[]> {
  const result = await db
    .prepare(
      `SELECT revision_id, project_id, revision_number, document_json, published_at
       FROM project_revisions WHERE project_id = ? ORDER BY revision_number`,
    )
    .bind(projectId)
    .all<RevisionRow>();
  return result.results.map(toStoredRevision);
}

export async function getPublished(
  db: D1Database,
  projectId: string,
): Promise<StoredRevision | null> {
  const row = await db
    .prepare(
      `SELECT r.revision_id, r.project_id, r.revision_number, r.document_json, r.published_at
       FROM projects p
       JOIN project_revisions r ON r.revision_id = p.current_revision_id
       WHERE p.project_id = ?`,
    )
    .bind(projectId)
    .first<RevisionRow>();
  return row ? toStoredRevision(row) : null;
}
