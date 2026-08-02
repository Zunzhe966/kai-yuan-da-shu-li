import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

interface Manifest {
  schema_version: string;
  revision_watermark: string;
  counts: Record<string, number>;
  files: Array<{ name: string; count: number; sha256: string }>;
}

interface LatestBackupPointer {
  schema_version: string;
  manifest_key: string;
  manifest_sha256: string;
}

const BACKUP_FILES = [
  { name: "actors.jsonl", table: "actors" },
  { name: "projects.jsonl", table: "projects" },
  { name: "project-revisions.jsonl", table: "project_revisions" },
  { name: "repository-sources.jsonl", table: "repository_sources" },
  { name: "project-search-facets.jsonl", table: "project_search_facets" },
  { name: "projects-fts.jsonl", table: "projects_fts" },
  { name: "creators.jsonl", table: "creators" },
  {
    name: "creator-external-repositories.jsonl",
    table: "creator_external_repositories",
  },
  { name: "creator-revisions.jsonl", table: "creator_revisions" },
  { name: "creator-project-roles.jsonl", table: "creator_project_roles" },
  { name: "evidence.jsonl", table: "evidence" },
  { name: "drafts.jsonl", table: "drafts" },
  { name: "submissions.jsonl", table: "submissions" },
  { name: "reviews.jsonl", table: "reviews" },
  { name: "change-reports.jsonl", table: "change_reports" },
  { name: "audit-events.jsonl", table: "audit_events" },
] as const;

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function runWrangler(args: string[], backupToken: string | null): void {
  const childEnvironment = { ...process.env };
  delete childEnvironment.CLOUDFLARE_API_KEY;
  delete childEnvironment.CLOUDFLARE_EMAIL;
  delete childEnvironment.CLOUDFLARE_API_TOKEN;
  if (backupToken) {
    childEnvironment.CLOUDFLARE_API_TOKEN = backupToken;
  }
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`wrangler failed with exit code ${result.status ?? "unknown"}`);
  }
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const bucket = option("--bucket");
const manifestKey = option("--manifest-key");
const output = option("--output");
const persistTo = option("--persist-to");
const local = process.argv.includes("--local");
const remote = process.argv.includes("--remote");
if (!bucket || !output || local === remote) {
  throw new Error(
    "usage: npm run backup:export -- --bucket <name> --output <directory> [--manifest-key <key>] (--local | --remote)",
  );
}
const backupToken = remote
  ? (process.env.CLOUDFLARE_BACKUP_API_TOKEN?.trim() ?? null)
  : null;
if (remote && !backupToken) {
  throw new Error(
    "CLOUDFLARE_BACKUP_API_TOKEN is required and must have only R2 Object Read access",
  );
}
if (remote && !process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID is required for a remote backup export");
}
const target = local ? "--local" : "--remote";
const storageArgs = persistTo ? [target, "--persist-to", persistTo] : [target];

let resolvedManifestKey = manifestKey;
let expectedManifestHash: string | null = null;
if (!resolvedManifestKey) {
  const pointerDirectory = mkdtempSync(join(tmpdir(), "kaiyuan-backup-pointer-"));
  try {
    const pointerPath = join(pointerDirectory, "latest.json");
    runWrangler([
      "r2",
      "object",
      "get",
      `${bucket}/backups/latest.json`,
      "--file",
      pointerPath,
      ...storageArgs,
    ], backupToken);
    const pointer = JSON.parse(
      readFileSync(pointerPath, "utf8"),
    ) as LatestBackupPointer;
    if (pointer.schema_version !== "kaiyuan-backup-pointer-v1") {
      throw new Error(`unsupported backup pointer schema: ${pointer.schema_version}`);
    }
    resolvedManifestKey = pointer.manifest_key;
    expectedManifestHash = pointer.manifest_sha256;
  } finally {
    rmSync(pointerDirectory, { recursive: true, force: true });
  }
}
if (
  !resolvedManifestKey.startsWith("backups/") ||
  !resolvedManifestKey.endsWith("/manifest.json")
) {
  throw new Error("manifest key must be a backups/.../manifest.json object");
}

mkdirSync(output, { recursive: true });
const manifestPath = join(output, "manifest.json");
runWrangler([
  "r2",
  "object",
  "get",
  `${bucket}/${resolvedManifestKey}`,
  "--file",
  manifestPath,
  ...storageArgs,
], backupToken);
if (expectedManifestHash && hashFile(manifestPath) !== expectedManifestHash) {
  throw new Error("manifest hash does not match backups/latest.json");
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
if (manifest.schema_version !== "kaiyuan-backup-v1") {
  throw new Error(`unsupported backup schema: ${manifest.schema_version}`);
}
const names = new Set(manifest.files.map((file) => file.name));
const manifestFilesByName = new Map(
  manifest.files.map((file) => [file.name, file]),
);
if (names.size !== manifest.files.length) {
  throw new Error("backup manifest contains duplicate file entries");
}
const expectedNames = new Set(BACKUP_FILES.map((file) => file.name));
for (const file of BACKUP_FILES) {
  if (!names.has(file.name)) {
    throw new Error(`backup manifest entry missing: ${file.name}`);
  }
}
for (const name of names) {
  if (!expectedNames.has(name as (typeof BACKUP_FILES)[number]["name"])) {
    throw new Error(`unexpected backup manifest entry: ${name}`);
  }
}
const expectedCountNames = new Set(BACKUP_FILES.map((file) => file.table));
for (const file of BACKUP_FILES) {
  if (!(file.table in manifest.counts)) {
    throw new Error(`backup manifest count missing: ${file.table}`);
  }
  if (manifest.counts[file.table] !== manifestFilesByName.get(file.name)!.count) {
    throw new Error(`backup manifest count mismatch: ${file.table}`);
  }
}
for (const name of Object.keys(manifest.counts)) {
  if (!expectedCountNames.has(name as (typeof BACKUP_FILES)[number]["table"])) {
    throw new Error(`unexpected backup manifest count: ${name}`);
  }
}
const prefix = resolvedManifestKey.slice(0, -"manifest.json".length);
for (const file of manifest.files) {
  if (basename(file.name) !== file.name) {
    throw new Error(`unsafe backup filename: ${file.name}`);
  }
  const destination = join(output, file.name);
  runWrangler([
    "r2",
    "object",
    "get",
    `${bucket}/${prefix}${file.name}`,
    "--file",
    destination,
    ...storageArgs,
  ], backupToken);
  if (hashFile(destination) !== file.sha256) {
    throw new Error(`hash mismatch after download: ${file.name}`);
  }
  const lineCount = readFileSync(destination, "utf8").split("\n").filter(Boolean).length;
  if (lineCount !== file.count) {
    throw new Error(`row count mismatch after download: ${file.name}`);
  }
}
const calculatedWatermark = createHash("sha256")
  .update(
    `${BACKUP_FILES.map((file) => `${file.name}:${manifestFilesByName.get(file.name)!.sha256}`).join("\n")}\n`,
  )
  .digest("hex");
if (calculatedWatermark !== manifest.revision_watermark) {
  throw new Error("backup revision watermark mismatch");
}

console.log(JSON.stringify({ output, files: manifest.files.length }, null, 2));
