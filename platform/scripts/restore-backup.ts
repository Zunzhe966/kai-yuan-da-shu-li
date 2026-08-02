import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface Manifest {
  schema_version: string;
  revision_watermark: string;
  counts: Record<string, number>;
  files: Array<{ name: string; count: number; sha256: string }>;
}

interface RestoreSpec {
  file: string;
  table: string;
  columns: string[];
}

// Portable snapshots intentionally exclude credentials and operational run records.
const SPECS: RestoreSpec[] = [
  { file: "actors.jsonl", table: "actors", columns: ["actor_id", "actor_type", "display_name", "status", "created_at", "updated_at"] },
  { file: "projects.jsonl", table: "projects", columns: ["project_id", "primary_platform", "primary_platform_repository_id", "name", "chinese_name", "summary", "status", "current_revision_id", "current_revision_number", "created_at", "updated_at"] },
  { file: "project-revisions.jsonl", table: "project_revisions", columns: ["revision_id", "project_id", "revision_number", "schema_version", "document_json", "content_hash", "published_by_actor_id", "published_at"] },
  { file: "repository-sources.jsonl", table: "repository_sources", columns: ["repository_source_id", "project_id", "platform", "platform_repository_id", "canonical_url", "full_name", "role", "metadata_json", "observed_at"] },
  { file: "project-search-facets.jsonl", table: "project_search_facets", columns: ["project_id", "facet_type", "facet_value"] },
  { file: "projects-fts.jsonl", table: "projects_fts", columns: ["project_id", "name", "aliases", "summary", "use_when", "avoid_when", "section_text"] },
  { file: "creators.jsonl", table: "creators", columns: ["creator_id", "creator_type", "name", "display_name", "biography", "current_revision_id", "created_at", "updated_at", "aliases_json", "official_sites_json", "social_profiles_json", "code_host_identities_json"] },
  { file: "creator-external-repositories.jsonl", table: "creator_external_repositories", columns: ["creator_id", "platform", "platform_repository_id", "full_name", "canonical_url", "summary", "observed_at"] },
  { file: "creator-revisions.jsonl", table: "creator_revisions", columns: ["revision_id", "creator_id", "revision_number", "document_json", "published_at"] },
  { file: "creator-project-roles.jsonl", table: "creator_project_roles", columns: ["creator_id", "project_id", "role", "evidence_ids_json"] },
  { file: "evidence.jsonl", table: "evidence", columns: ["evidence_id", "project_id", "revision_id", "url", "source_type", "document_json", "retrieved_at"] },
  { file: "drafts.jsonl", table: "drafts", columns: ["draft_id", "project_id", "status", "base_revision", "document_json", "created_by_actor_id", "updated_by_actor_id", "created_at", "updated_at"] },
  { file: "pending-repository-claims.jsonl", table: "pending_repository_claims", columns: ["claim_id", "platform", "platform_repository_id", "canonical_url", "draft_id", "created_at", "released_at"] },
  { file: "submissions.jsonl", table: "submissions", columns: ["submission_id", "draft_id", "submitted_by_actor_id", "risk_level", "submitted_at"] },
  { file: "reviews.jsonl", table: "reviews", columns: ["review_id", "submission_id", "reviewer_actor_id", "decision", "notes", "created_at"] },
  { file: "change-reports.jsonl", table: "change_reports", columns: ["report_id", "project_id", "report_type", "upstream_fingerprint", "status", "evidence_url", "payload_json", "next_attempt_at", "created_at", "updated_at"] },
  { file: "audit-events.jsonl", table: "audit_events", columns: ["audit_event_id", "actor_id", "action", "target_type", "target_id", "reason", "diff_json", "evidence_ids_json", "created_at"] },
];

const EMPTY_RESTORE_TABLES = [
  ...SPECS.map((spec) => spec.table),
  "creation_tickets",
  "api_credentials",
  "backup_runs",
];

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function hash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("backup contains a non-finite number");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value !== "string") throw new Error("backup contains a non-scalar SQL value");
  return `'${value.replaceAll("'", "''")}'`;
}

function runWrangler(args: string[], capture = false): string {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      capture ? result.stderr || "wrangler failed" : `wrangler failed with exit code ${result.status ?? "unknown"}`,
    );
  }
  return capture ? result.stdout : "";
}

const snapshotDirectory = option("--snapshot");
const database = option("--database");
const persistTo = option("--persist-to");
const local = process.argv.includes("--local");
const remote = process.argv.includes("--remote");
if (!snapshotDirectory || !database || local === remote) {
  throw new Error(
    "usage: npm run backup:restore -- --snapshot <directory> --database <name> (--local | --remote)",
  );
}
const target = local ? "--local" : "--remote";
const storageArgs = persistTo ? [target, "--persist-to", persistTo] : [target];
const manifest = JSON.parse(
  readFileSync(join(snapshotDirectory, "manifest.json"), "utf8"),
) as Manifest;
if (manifest.schema_version !== "kaiyuan-backup-v1") {
  throw new Error(`unsupported backup schema: ${manifest.schema_version}`);
}
const expectedFiles = new Set(SPECS.map((spec) => spec.file));
const manifestFiles = new Set(manifest.files.map((file) => file.name));
const manifestFilesByName = new Map(
  manifest.files.map((file) => [file.name, file]),
);
if (manifestFiles.size !== manifest.files.length) {
  throw new Error("backup manifest contains duplicate file entries");
}
for (const spec of SPECS) {
  if (!manifestFiles.has(spec.file)) {
    throw new Error(`backup manifest entry missing: ${spec.file}`);
  }
}
for (const name of manifestFiles) {
  if (!expectedFiles.has(name)) {
    throw new Error(`unexpected backup manifest entry: ${name}`);
  }
}
const expectedCountNames = new Set(SPECS.map((spec) => spec.table));
for (const spec of SPECS) {
  if (!(spec.table in manifest.counts)) {
    throw new Error(`backup manifest count missing: ${spec.table}`);
  }
  if (manifest.counts[spec.table] !== manifestFilesByName.get(spec.file)!.count) {
    throw new Error(`backup manifest count mismatch: ${spec.table}`);
  }
}
for (const name of Object.keys(manifest.counts)) {
  if (!expectedCountNames.has(name)) {
    throw new Error(`unexpected backup manifest count: ${name}`);
  }
}
for (const file of manifest.files) {
  const path = join(snapshotDirectory, file.name);
  if (hash(path) !== file.sha256) throw new Error(`hash mismatch: ${file.name}`);
  const lineCount = readFileSync(path, "utf8").split("\n").filter(Boolean).length;
  if (lineCount !== file.count) throw new Error(`row count mismatch: ${file.name}`);
}
const calculatedWatermark = createHash("sha256")
  .update(
    `${SPECS.map((spec) => `${spec.file}:${manifestFilesByName.get(spec.file)!.sha256}`).join("\n")}\n`,
  )
  .digest("hex");
if (calculatedWatermark !== manifest.revision_watermark) {
  throw new Error("backup revision watermark mismatch");
}

runWrangler(["d1", "migrations", "apply", database, ...storageArgs]);
const countOutput = runWrangler(
  [
    "d1",
    "execute",
    database,
    ...storageArgs,
    "--command",
    `SELECT ${EMPTY_RESTORE_TABLES.map((table) => `(SELECT COUNT(*) FROM ${table})`).join(" + ")} AS count;`,
    "--json",
  ],
  true,
);
const countPayload = JSON.parse(countOutput) as Array<{ results?: Array<{ count?: number }> }>;
if ((countPayload[0]?.results?.[0]?.count ?? 0) !== 0) {
  throw new Error("restore target database is not empty");
}

const statements: string[] = ["PRAGMA foreign_keys = ON;"];
for (const spec of SPECS) {
  const rows = readFileSync(join(snapshotDirectory, spec.file), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  for (const row of rows) {
    statements.push(
      `INSERT INTO ${spec.table} (${spec.columns.join(", ")}) VALUES (${spec.columns.map((column) => sqlValue(row[column])).join(", ")});`,
    );
  }
}
const sqlDirectory = mkdtempSync(join(tmpdir(), "kaiyuan-backup-restore-"));
try {
  const sqlPath = join(sqlDirectory, "restore.sql");
  writeFileSync(sqlPath, `${statements.join("\n")}\n`, { mode: 0o600 });
  runWrangler(["d1", "execute", database, ...storageArgs, "--file", sqlPath]);
} finally {
  rmSync(sqlDirectory, { recursive: true, force: true });
}
console.log(JSON.stringify({ database, target, restored_files: SPECS.length }, null, 2));
