import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

interface Manifest {
  schema_version: string;
  files: Array<{ name: string; count: number; sha256: string }>;
}

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
if (!bucket || !manifestKey || !output || local === remote) {
  throw new Error(
    "usage: npm run backup:export -- --bucket <name> --manifest-key <key> --output <directory> (--local | --remote)",
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
if (!manifestKey.startsWith("backups/") || !manifestKey.endsWith("/manifest.json")) {
  throw new Error("manifest key must be a backups/.../manifest.json object");
}
const target = local ? "--local" : "--remote";
const storageArgs = persistTo ? [target, "--persist-to", persistTo] : [target];

mkdirSync(output, { recursive: true });
const manifestPath = join(output, "manifest.json");
runWrangler([
  "r2",
  "object",
  "get",
  `${bucket}/${manifestKey}`,
  "--file",
  manifestPath,
  ...storageArgs,
], backupToken);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
if (manifest.schema_version !== "kaiyuan-backup-v1") {
  throw new Error(`unsupported backup schema: ${manifest.schema_version}`);
}
const prefix = manifestKey.slice(0, -"manifest.json".length);
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
}

console.log(JSON.stringify({ output, files: manifest.files.length }, null, 2));
