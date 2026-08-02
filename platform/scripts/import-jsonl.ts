import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SECTION_KEYS, type ProjectPublication } from "../src/domain/project";
import {
  chunkRecords,
  parseAndValidateJsonl,
  selectUniqueRepositories,
} from "../src/services/import";

interface CliOptions {
  inputPath: string;
  mode: "local" | "remote";
  reportPath: string;
  dryRun: boolean;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("cannot encode a non-finite SQL number");
    }
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function values(items: unknown[]): string {
  return items.map(sqlLiteral).join(", ");
}

function facetEntries(record: ProjectPublication): Array<[string, string]> {
  const discovery = record.discovery;
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
  return groups.flatMap(([type, facetValues]) =>
    facetValues.map((value) => [type, value] as [string, string]),
  );
}

function recordSql(record: ProjectPublication): string[] {
  const primary =
    record.repository_sources.find((source) => source.role === "primary") ??
    record.repository_sources[0];
  if (!primary) {
    throw new Error(`project ${record.project_id} has no repository source`);
  }
  const revision = record.publication.revision;
  const revisionId = `${record.project_id}:r${revision}`;
  const publishedAt = record.publication.published_at ?? primary.observed_at;
  const documentJson = JSON.stringify(record);
  const sectionText = SECTION_KEYS.map((key) => {
    const section = record.sections[key];
    return `${section.summary}\n${section.body}\n${section.key_points.join("\n")}`;
  }).join("\n");
  const statements = [
    `INSERT INTO projects (project_id, primary_platform, primary_platform_repository_id, name, chinese_name, summary, status, created_at, updated_at) VALUES (${values([record.project_id, primary.platform, primary.platform_repository_id, record.card.name, record.card.chinese_name, record.card.summary, record.card.maintenance_status, publishedAt, publishedAt])}) ON CONFLICT(project_id) DO NOTHING;`,
    `INSERT INTO project_revisions (revision_id, project_id, revision_number, schema_version, document_json, published_by_actor_id, published_at) VALUES (${values([revisionId, record.project_id, revision, record.schema_version, documentJson, null, publishedAt])});`,
    `UPDATE projects SET name = ${sqlLiteral(record.card.name)}, chinese_name = ${sqlLiteral(record.card.chinese_name)}, summary = ${sqlLiteral(record.card.summary)}, status = ${sqlLiteral(record.card.maintenance_status)}, current_revision_id = ${sqlLiteral(revisionId)}, current_revision_number = ${revision}, updated_at = ${sqlLiteral(publishedAt)} WHERE project_id = ${sqlLiteral(record.project_id)};`,
    `DELETE FROM project_search_facets WHERE project_id = ${sqlLiteral(record.project_id)};`,
    `DELETE FROM projects_fts WHERE project_id = ${sqlLiteral(record.project_id)};`,
    `INSERT INTO projects_fts (project_id, name, aliases, summary, use_when, avoid_when, section_text) VALUES (${values([record.project_id, record.card.name, record.identity.aliases.join(" "), record.card.summary, record.card.use_when, record.card.avoid_when, sectionText])});`,
  ];

  for (const source of record.repository_sources) {
    statements.push(
      `INSERT INTO repository_sources (repository_source_id, project_id, platform, platform_repository_id, canonical_url, full_name, role, metadata_json, observed_at) VALUES (${values([`${source.platform}:${source.platform_repository_id}`, record.project_id, source.platform, source.platform_repository_id, source.canonical_url, source.full_name, source.role, JSON.stringify(source), source.observed_at])}) ON CONFLICT(platform, platform_repository_id) DO UPDATE SET canonical_url = excluded.canonical_url, full_name = excluded.full_name, role = excluded.role, metadata_json = excluded.metadata_json, observed_at = excluded.observed_at;`,
    );
  }
  for (const [type, value] of facetEntries(record)) {
    statements.push(
      `INSERT INTO project_search_facets (project_id, facet_type, facet_value) VALUES (${values([record.project_id, type, value])});`,
    );
  }
  for (const evidence of record.evidence) {
    statements.push(
      `INSERT INTO evidence (evidence_id, project_id, revision_id, url, source_type, document_json, retrieved_at) VALUES (${values([evidence.evidence_id, record.project_id, revisionId, evidence.url, evidence.source_type, JSON.stringify(evidence), evidence.retrieved_at])});`,
    );
  }
  return statements;
}

export function createBatchSql(records: ProjectPublication[]): string {
  return records.flatMap(recordSql).join("\n") + "\n";
}

function parseCli(argv: string[]): CliOptions {
  const inputPath = argv.find((value) => !value.startsWith("--"));
  if (!inputPath) {
    throw new Error("usage: import-jsonl.ts <file> (--local|--remote) [--report file]");
  }
  const local = argv.includes("--local");
  const remote = argv.includes("--remote");
  if (local === remote) {
    throw new Error("choose exactly one of --local or --remote");
  }
  const reportIndex = argv.indexOf("--report");
  const requestedReportPath =
    reportIndex >= 0 ? argv[reportIndex + 1] : undefined;
  const reportPath = requestedReportPath ?? `${inputPath}.import-report.json`;
  return {
    inputPath,
    mode: local ? "local" : "remote",
    reportPath,
    dryRun: argv.includes("--dry-run"),
  };
}

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const input = await readFile(options.inputPath, "utf8");
  const parsed = parseAndValidateJsonl(input);
  const selection = selectUniqueRepositories(parsed);
  const batches = chunkRecords(selection.records);
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "kaiyuan-d1-import-"),
  );

  try {
    if (!options.dryRun) {
      for (const [index, batch] of batches.entries()) {
        const sqlPath = path.join(temporaryDirectory, `batch-${index + 1}.sql`);
        await writeFile(sqlPath, createBatchSql(batch), "utf8");
        const command = process.platform === "win32" ? "npx.cmd" : "npx";
        const result = spawnSync(
          command,
          [
            "wrangler",
            "d1",
            "execute",
            "DB",
            `--${options.mode}`,
            "--yes",
            "--file",
            sqlPath,
          ],
          { cwd: path.resolve(import.meta.dirname, ".."), stdio: "inherit" },
        );
        if (result.status !== 0) {
          throw new Error(`D1 import batch ${index + 1} failed`);
        }
      }
    }

    const report = {
      source_count: parsed.length,
      imported_count: options.dryRun ? 0 : selection.records.length,
      candidate_count: selection.records.length,
      duplicate_count: selection.duplicates.length,
      batch_count: batches.length,
      dry_run: options.dryRun,
      duplicates: selection.duplicates,
    };
    await writeFile(
      options.reportPath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(report));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  await main();
}
