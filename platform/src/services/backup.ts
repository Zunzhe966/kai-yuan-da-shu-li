export const BACKUP_SCHEMA_VERSION = "kaiyuan-backup-v1" as const;

export interface BackupFile {
  content: string;
  count: number;
  sha256: string;
}

export interface BackupManifest {
  schema_version: typeof BACKUP_SCHEMA_VERSION;
  exported_at: string;
  revision_watermark: string;
  counts: Record<string, number>;
  files: Array<{ name: string; count: number; sha256: string }>;
}

export interface BackupSnapshot {
  manifest: BackupManifest;
  files: Record<string, BackupFile>;
}

interface TableSpec {
  table: string;
  file: string;
  columns: readonly string[];
  orderBy: string;
}

// Keep credentials, creation tickets, and backup-run history out of portable snapshots.
const TABLE_SPECS: readonly TableSpec[] = [
  {
    table: "actors",
    file: "actors.jsonl",
    columns: [
      "actor_id",
      "actor_type",
      "display_name",
      "status",
      "created_at",
      "updated_at",
    ],
    orderBy: "actor_id",
  },
  {
    table: "projects",
    file: "projects.jsonl",
    columns: [
      "project_id",
      "primary_platform",
      "primary_platform_repository_id",
      "name",
      "chinese_name",
      "summary",
      "status",
      "current_revision_id",
      "current_revision_number",
      "created_at",
      "updated_at",
    ],
    orderBy: "project_id",
  },
  {
    table: "project_revisions",
    file: "project-revisions.jsonl",
    columns: [
      "revision_id",
      "project_id",
      "revision_number",
      "schema_version",
      "document_json",
      "content_hash",
      "published_by_actor_id",
      "published_at",
    ],
    orderBy: "project_id, revision_number",
  },
  {
    table: "repository_sources",
    file: "repository-sources.jsonl",
    columns: [
      "repository_source_id",
      "project_id",
      "platform",
      "platform_repository_id",
      "canonical_url",
      "full_name",
      "role",
      "metadata_json",
      "observed_at",
    ],
    orderBy: "project_id, repository_source_id",
  },
  {
    table: "project_search_facets",
    file: "project-search-facets.jsonl",
    columns: ["project_id", "facet_type", "facet_value"],
    orderBy: "project_id, facet_type, facet_value",
  },
  {
    table: "projects_fts",
    file: "projects-fts.jsonl",
    columns: [
      "project_id",
      "name",
      "aliases",
      "summary",
      "use_when",
      "avoid_when",
      "section_text",
    ],
    orderBy: "project_id",
  },
  {
    table: "creators",
    file: "creators.jsonl",
    columns: [
      "creator_id",
      "creator_type",
      "name",
      "display_name",
      "biography",
      "current_revision_id",
      "created_at",
      "updated_at",
      "aliases_json",
      "official_sites_json",
      "social_profiles_json",
      "code_host_identities_json",
    ],
    orderBy: "creator_id",
  },
  {
    table: "creator_external_repositories",
    file: "creator-external-repositories.jsonl",
    columns: [
      "creator_id",
      "platform",
      "platform_repository_id",
      "full_name",
      "canonical_url",
      "summary",
      "observed_at",
    ],
    orderBy: "creator_id, platform, platform_repository_id",
  },
  {
    table: "creator_revisions",
    file: "creator-revisions.jsonl",
    columns: [
      "revision_id",
      "creator_id",
      "revision_number",
      "document_json",
      "published_at",
    ],
    orderBy: "creator_id, revision_number",
  },
  {
    table: "creator_project_roles",
    file: "creator-project-roles.jsonl",
    columns: ["creator_id", "project_id", "role", "evidence_ids_json"],
    orderBy: "creator_id, project_id, role",
  },
  {
    table: "evidence",
    file: "evidence.jsonl",
    columns: [
      "evidence_id",
      "project_id",
      "revision_id",
      "url",
      "source_type",
      "document_json",
      "retrieved_at",
    ],
    orderBy: "project_id, revision_id, evidence_id",
  },
  {
    table: "drafts",
    file: "drafts.jsonl",
    columns: [
      "draft_id",
      "project_id",
      "status",
      "base_revision",
      "document_json",
      "created_by_actor_id",
      "updated_by_actor_id",
      "created_at",
      "updated_at",
    ],
    orderBy: "draft_id",
  },
  {
    table: "submissions",
    file: "submissions.jsonl",
    columns: [
      "submission_id",
      "draft_id",
      "submitted_by_actor_id",
      "risk_level",
      "submitted_at",
    ],
    orderBy: "submission_id",
  },
  {
    table: "reviews",
    file: "reviews.jsonl",
    columns: [
      "review_id",
      "submission_id",
      "reviewer_actor_id",
      "decision",
      "notes",
      "created_at",
    ],
    orderBy: "review_id",
  },
  {
    table: "change_reports",
    file: "change-reports.jsonl",
    columns: [
      "report_id",
      "project_id",
      "report_type",
      "upstream_fingerprint",
      "status",
      "evidence_url",
      "payload_json",
      "next_attempt_at",
      "created_at",
      "updated_at",
    ],
    orderBy: "report_id",
  },
  {
    table: "audit_events",
    file: "audit-events.jsonl",
    columns: [
      "audit_event_id",
      "actor_id",
      "action",
      "target_type",
      "target_id",
      "reason",
      "diff_json",
      "evidence_ids_json",
      "created_at",
    ],
    orderBy: "audit_event_id",
  },
] as const;

const EMPTY_RESTORE_TABLES = [
  ...TABLE_SPECS.map((spec) => spec.table),
  "creation_tickets",
  "api_credentials",
  "backup_runs",
] as const;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function calculateRevisionWatermark(
  files: Record<string, BackupFile>,
): Promise<string> {
  return sha256(
    `${TABLE_SPECS.map((spec) => `${spec.file}:${files[spec.file]!.sha256}`).join("\n")}\n`,
  );
}

function jsonLine(row: Record<string, unknown>, columns: readonly string[]): string {
  return JSON.stringify(
    Object.fromEntries(columns.map((column) => [column, row[column] ?? null])),
  );
}

async function exportRows(
  rows: Array<Record<string, unknown>>,
  spec: TableSpec,
): Promise<BackupFile> {
  const content = rows.length
    ? `${rows.map((row) => jsonLine(row, spec.columns)).join("\n")}\n`
    : "";
  return {
    content,
    count: rows.length,
    sha256: await sha256(content),
  };
}

export async function createBackupSnapshot(
  db: D1Database,
  exportedAt = new Date().toISOString(),
): Promise<BackupSnapshot> {
  const tableResults = await db.batch<Record<string, unknown>>(
    TABLE_SPECS.map((spec) =>
      db.prepare(
        `SELECT ${spec.columns.join(", ")} FROM ${spec.table} ORDER BY ${spec.orderBy}`,
      ),
    ),
  );
  const entries = await Promise.all(
    TABLE_SPECS.map(async (spec, index) => {
      const result = tableResults[index];
      if (!result) throw new Error(`backup query result missing: ${spec.table}`);
      return [spec.file, await exportRows(result.results, spec)] as const;
    }),
  );
  const files = Object.fromEntries(entries);
  const revisionWatermark = await calculateRevisionWatermark(files);
  const manifest: BackupManifest = {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: exportedAt,
    revision_watermark: revisionWatermark,
    counts: Object.fromEntries(
      TABLE_SPECS.map((spec) => [spec.table, files[spec.file]!.count]),
    ),
    files: TABLE_SPECS.map((spec) => ({
      name: spec.file,
      count: files[spec.file]!.count,
      sha256: files[spec.file]!.sha256,
    })),
  };
  return { manifest, files };
}

export async function writeBackupToR2(
  bucket: R2Bucket,
  snapshot: BackupSnapshot,
): Promise<string> {
  const date = new Date(snapshot.manifest.exported_at);
  if (Number.isNaN(date.valueOf())) throw new Error("backup export time is invalid");
  const prefix = `backups/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${snapshot.manifest.revision_watermark}`;
  await Promise.all(
    Object.entries(snapshot.files).map(([name, file]) =>
      bucket.put(`${prefix}/${name}`, file.content, {
        httpMetadata: { contentType: "application/x-ndjson; charset=utf-8" },
        customMetadata: { sha256: file.sha256, count: String(file.count) },
      }),
    ),
  );
  await bucket.put(
    `${prefix}/manifest.json`,
    `${JSON.stringify(snapshot.manifest, null, 2)}\n`,
    { httpMetadata: { contentType: "application/json; charset=utf-8" } },
  );
  return prefix;
}

export interface CompletedBackupRun {
  backupRunId: string;
  manifestKey: string;
  manifestHash: string;
  revisionWatermark: string;
}

export async function executeBackup(
  db: D1Database,
  bucket: R2Bucket,
  now = new Date().toISOString(),
): Promise<CompletedBackupRun> {
  const backupRunId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO backup_runs (
        backup_run_id, status, started_at
      ) VALUES (?, 'running', ?)`,
    )
    .bind(backupRunId, now)
    .run();
  try {
    const snapshot = await createBackupSnapshot(db, now);
    const prefix = await writeBackupToR2(bucket, snapshot);
    const manifestKey = `${prefix}/manifest.json`;
    const manifestHash = await sha256(`${JSON.stringify(snapshot.manifest, null, 2)}\n`);
    await bucket.put(
      "backups/latest.json",
      `${JSON.stringify(
        {
          schema_version: "kaiyuan-backup-pointer-v1",
          exported_at: now,
          revision_watermark: snapshot.manifest.revision_watermark,
          manifest_key: manifestKey,
          manifest_sha256: manifestHash,
        },
        null,
        2,
      )}\n`,
      { httpMetadata: { contentType: "application/json; charset=utf-8" } },
    );
    await db
      .prepare(
        `UPDATE backup_runs SET status = 'completed', revision_watermark = ?,
           manifest_key = ?, manifest_hash = ?, completed_at = ?
         WHERE backup_run_id = ?`,
      )
      .bind(
        snapshot.manifest.revision_watermark,
        manifestKey,
        manifestHash,
        now,
        backupRunId,
      )
      .run();
    return {
      backupRunId,
      manifestKey,
      manifestHash,
      revisionWatermark: snapshot.manifest.revision_watermark,
    };
  } catch (error) {
    await db
      .prepare(
        `UPDATE backup_runs SET status = 'failed', error_message = ?, completed_at = ?
         WHERE backup_run_id = ?`,
      )
      .bind(
        error instanceof Error ? error.message.slice(0, 1000) : "backup failed",
        now,
        backupRunId,
      )
      .run();
    throw error;
  }
}

function parseJsonl(content: string): Array<Record<string, unknown>> {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const value = JSON.parse(line) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("backup JSONL row must be an object");
      }
      return value as Record<string, unknown>;
    });
}

async function verifySnapshot(snapshot: BackupSnapshot): Promise<void> {
  if (snapshot.manifest.schema_version !== BACKUP_SCHEMA_VERSION) {
    throw new Error("unsupported backup schema version");
  }
  const expectedNames = new Set(TABLE_SPECS.map((spec) => spec.file));
  const manifestNames = new Set(
    snapshot.manifest.files.map((manifestFile) => manifestFile.name),
  );
  if (manifestNames.size !== snapshot.manifest.files.length) {
    throw new Error("backup manifest contains duplicate file entries");
  }
  for (const spec of TABLE_SPECS) {
    if (!manifestNames.has(spec.file)) {
      throw new Error(`backup manifest entry missing: ${spec.file}`);
    }
  }
  for (const name of manifestNames) {
    if (!expectedNames.has(name)) {
      throw new Error(`unexpected backup manifest entry: ${name}`);
    }
  }
  const manifestFiles = new Map(
    snapshot.manifest.files.map((manifestFile) => [manifestFile.name, manifestFile]),
  );
  const expectedCountNames = new Set(TABLE_SPECS.map((spec) => spec.table));
  for (const spec of TABLE_SPECS) {
    if (!(spec.table in snapshot.manifest.counts)) {
      throw new Error(`backup manifest count missing: ${spec.table}`);
    }
    if (snapshot.manifest.counts[spec.table] !== manifestFiles.get(spec.file)!.count) {
      throw new Error(`backup manifest count mismatch: ${spec.table}`);
    }
  }
  for (const name of Object.keys(snapshot.manifest.counts)) {
    if (!expectedCountNames.has(name)) {
      throw new Error(`unexpected backup manifest count: ${name}`);
    }
  }
  for (const manifestFile of snapshot.manifest.files) {
    const file = snapshot.files[manifestFile.name];
    if (!file) throw new Error(`backup file missing: ${manifestFile.name}`);
    const actualHash = await sha256(file.content);
    if (actualHash !== manifestFile.sha256 || actualHash !== file.sha256) {
      throw new Error(`backup hash mismatch: ${manifestFile.name}`);
    }
    const rows = parseJsonl(file.content);
    if (rows.length !== manifestFile.count || rows.length !== file.count) {
      throw new Error(`backup row count mismatch: ${manifestFile.name}`);
    }
  }
  if (
    (await calculateRevisionWatermark(snapshot.files)) !==
    snapshot.manifest.revision_watermark
  ) {
    throw new Error("backup revision watermark mismatch");
  }
}

function prepareInsertRows(
  db: D1Database,
  spec: TableSpec,
  rows: Array<Record<string, unknown>>,
): D1PreparedStatement[] {
  const sql = `INSERT INTO ${spec.table} (${spec.columns.join(", ")}) VALUES (${spec.columns.map(() => "?").join(", ")})`;
  return rows.map((row) =>
    db
      .prepare(sql)
      .bind(...spec.columns.map((column) => row[column])),
  );
}

export async function restoreBackup(
  db: D1Database,
  snapshot: BackupSnapshot,
): Promise<void> {
  await verifySnapshot(snapshot);
  const existing = await db
    .prepare(
      `SELECT ${EMPTY_RESTORE_TABLES.map((table) => `(SELECT COUNT(*) FROM ${table})`).join(" + ")} AS count`,
    )
    .first<{ count: number }>();
  if ((existing?.count ?? 0) !== 0) {
    throw new Error("restore target database is not empty");
  }
  const statements = TABLE_SPECS.flatMap((spec) =>
    prepareInsertRows(
      db,
      spec,
      parseJsonl(snapshot.files[spec.file]!.content),
    ),
  );
  if (statements.length > 0) {
    await db.batch(statements);
  }
}
