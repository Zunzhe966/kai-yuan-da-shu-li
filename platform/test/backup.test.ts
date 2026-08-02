import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createBackupSnapshot,
  executeBackup,
  restoreBackup,
  writeBackupToR2,
} from "../src/services/backup";
import { runScheduledTasks } from "../src/scheduled";
import * as creators from "../src/storage/creators";
import * as projects from "../src/storage/projects";
import * as workflow from "../src/storage/workflow";
import { projectFixture, TEST_NOW } from "./factories";

interface TestEnv {
  DB: D1Database;
  RESTORE_DB: D1Database;
  NONEMPTY_RESTORE_DB: D1Database;
  FAILED_RESTORE_DB: D1Database;
  BACKUPS: R2Bucket;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

async function testSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  await applyD1Migrations(testEnv.RESTORE_DB, testEnv.TEST_MIGRATIONS);
  await applyD1Migrations(testEnv.NONEMPTY_RESTORE_DB, testEnv.TEST_MIGRATIONS);
  await applyD1Migrations(testEnv.FAILED_RESTORE_DB, testEnv.TEST_MIGRATIONS);
  await creators.upsertCreator(testEnv.DB, {
    creatorId: "creator-backup",
    type: "organization",
    name: "Backup Project Org",
    displayName: "备份项目组织",
    biography: "用于验证作者资料和项目角色能够恢复。",
    aliases: ["Backup Org"],
    officialSites: ["https://example.com/backup-org"],
    socialProfiles: [],
    codeHostIdentities: ["github:backup-org"],
  });
  await testEnv.DB.prepare(
    `INSERT INTO creator_external_repositories (
      creator_id, platform, platform_repository_id, full_name,
      canonical_url, summary, observed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      "creator-backup",
      "github",
      "repository-unreviewed",
      "backup-org/unreviewed",
      "https://github.com/backup-org/unreviewed",
      "Awaiting editorial review",
      TEST_NOW,
    )
    .run();
  await testEnv.DB.batch([
    testEnv.DB.prepare(
      `INSERT INTO creator_revisions (
        revision_id, creator_id, revision_number, document_json, published_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      "creator-revision-backup-1",
      "creator-backup",
      1,
      JSON.stringify({ creator_id: "creator-backup" }),
      TEST_NOW,
    ),
    testEnv.DB.prepare(
      "UPDATE creators SET current_revision_id = ? WHERE creator_id = ?",
    ).bind("creator-revision-backup-1", "creator-backup"),
  ]);
  for (const [projectId, repositoryId] of [
    ["project-backup-one", "repository-backup-one"],
    ["project-backup-two", "repository-backup-two"],
  ] as const) {
    const document = projectFixture({
      projectId,
      repositoryId,
      status: "published",
    });
    document.attribution = [
      {
        creator_id: "creator-backup",
        role: "organization",
        evidence_ids: ["repo-readme"],
      },
    ];
    await projects.insertRevision(testEnv.DB, document);
    await creators.replaceProjectRoles(testEnv.DB, projectId, document.attribution);
  }
  await testEnv.DB.prepare(
    `INSERT INTO actors (actor_id, actor_type, display_name)
     VALUES ('actor-backup-editor', 'agent', 'Backup Editor')`,
  ).run();
  await workflow.createDraft(testEnv.DB, {
    draftId: "draft-backup-pending",
    projectId: null,
    baseRevision: 0,
    document: projectFixture({
      projectId: "project-backup-pending",
      repositoryId: "repository-backup-pending",
    }),
    actorId: "actor-backup-editor",
    createdAt: TEST_NOW,
  });
  await testEnv.DB.prepare(
    `INSERT INTO pending_repository_claims (
      claim_id, platform, platform_repository_id, canonical_url,
      draft_id, created_at
    ) VALUES ('claim-backup-pending', 'github', 'repository-backup-pending',
              'https://github.com/example/project', 'draft-backup-pending', ?)`,
  )
    .bind(TEST_NOW)
    .run();
});

describe("deterministic backup and restore", () => {
  it("attempts backup and report tasks even when either one fails", async () => {
    const attempted: string[] = [];

    await expect(
      runScheduledTasks(
        async () => {
          attempted.push("backup");
          throw new Error("backup failed");
        },
        async () => {
          attempted.push("reports");
        },
      ),
    ).rejects.toThrow("backup failed");
    expect(attempted).toEqual(["backup", "reports"]);
  });

  it("reads every table through one D1 batch snapshot", async () => {
    let individualReads = 0;
    let batchReads = 0;
    const snapshotDb = {
      prepare(sql: string) {
        return {
          sql,
          async all() {
            individualReads += 1;
            return { results: [] };
          },
        };
      },
      async batch(statements: unknown[]) {
        batchReads += 1;
        return statements.map(() => ({ results: [] }));
      },
    } as unknown as D1Database;

    await createBackupSnapshot(snapshotDb, TEST_NOW);

    expect(batchReads).toBe(1);
    expect(individualReads).toBe(0);
  });

  it("records a completed R2 backup run with its manifest hash", async () => {
    const completed = await executeBackup(
      testEnv.DB,
      testEnv.BACKUPS,
      TEST_NOW,
    );
    const row = await testEnv.DB.prepare(
      `SELECT status, manifest_key, manifest_hash FROM backup_runs
       WHERE backup_run_id = ?`,
    )
      .bind(completed.backupRunId)
      .first<{
        status: string;
        manifest_key: string;
        manifest_hash: string;
      }>();

    expect(row).toEqual({
      status: "completed",
      manifest_key: completed.manifestKey,
      manifest_hash: completed.manifestHash,
    });
    expect(await testEnv.BACKUPS.head(completed.manifestKey)).not.toBeNull();
    const latest = await testEnv.BACKUPS.get("backups/latest.json");
    expect(JSON.parse((await latest?.text()) ?? "{}")).toEqual({
      schema_version: "kaiyuan-backup-pointer-v1",
      exported_at: TEST_NOW,
      revision_watermark: completed.revisionWatermark,
      manifest_key: completed.manifestKey,
      manifest_sha256: completed.manifestHash,
    });
  });

  it("publishes the manifest only after every JSONL object succeeds", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    const writtenKeys: string[] = [];
    const failingBucket = {
      async put(key: string): Promise<never> {
        writtenKeys.push(key);
        throw new Error("R2 write failed");
      },
    } as unknown as R2Bucket;

    await expect(writeBackupToR2(failingBucket, snapshot)).rejects.toThrow(
      "R2 write failed",
    );
    expect(writtenKeys.some((key) => key.endsWith("/manifest.json"))).toBe(false);
  });

  it("changes the watermark when any exported table changes", async () => {
    const before = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    await testEnv.DB.prepare(
      `INSERT INTO audit_events (
        audit_event_id, action, target_type, target_id, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind("backup-audit-change", "backup.test", "backup", "snapshot", "", TEST_NOW)
      .run();
    const after = await createBackupSnapshot(testEnv.DB, TEST_NOW);

    expect(after.manifest.revision_watermark).not.toBe(
      before.manifest.revision_watermark,
    );
  });

  it("restores content, revision identities and every exported hash", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);

    expect(snapshot.manifest.schema_version).toBe("kaiyuan-backup-v1");
    expect(snapshot.manifest.counts).toMatchObject({
      projects: 2,
      project_revisions: 2,
      creators: 1,
      creator_revisions: 1,
      creator_external_repositories: 1,
      creator_project_roles: 2,
      pending_repository_claims: 1,
    });
    expect(snapshot.files["projects.jsonl"]?.content).toContain(
      "project-backup-one",
    );
    expect(
      snapshot.files["projects.jsonl"]?.content
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { project_id: string })
        .map((row) => row.project_id),
    ).toEqual(["project-backup-one", "project-backup-two"]);

    const prefix = await writeBackupToR2(testEnv.BACKUPS, snapshot);
    expect(prefix).toBe(`backups/2026/08/02/${snapshot.manifest.revision_watermark}`);
    const storedManifest = await testEnv.BACKUPS.get(`${prefix}/manifest.json`);
    expect(
      JSON.parse((await storedManifest?.text()) ?? "{}"),
    ).toEqual(snapshot.manifest);

    await restoreBackup(testEnv.RESTORE_DB, snapshot);
    const restored = await createBackupSnapshot(testEnv.RESTORE_DB, TEST_NOW);

    expect(restored.manifest.counts).toEqual(snapshot.manifest.counts);
    expect(restored.manifest.revision_watermark).toBe(
      snapshot.manifest.revision_watermark,
    );
    const sourceRevisionIds = await testEnv.DB.prepare(
      "SELECT revision_id FROM project_revisions ORDER BY project_id, revision_number",
    ).all<{ revision_id: string }>();
    const restoredRevisionIds = await testEnv.RESTORE_DB.prepare(
      "SELECT revision_id FROM project_revisions ORDER BY project_id, revision_number",
    ).all<{ revision_id: string }>();
    expect(restoredRevisionIds.results).toEqual(sourceRevisionIds.results);
    const sourceCreatorRevisionIds = await testEnv.DB.prepare(
      "SELECT revision_id FROM creator_revisions ORDER BY creator_id, revision_number",
    ).all<{ revision_id: string }>();
    const restoredCreatorRevisionIds = await testEnv.RESTORE_DB.prepare(
      "SELECT revision_id FROM creator_revisions ORDER BY creator_id, revision_number",
    ).all<{ revision_id: string }>();
    expect(restoredCreatorRevisionIds.results).toEqual(
      sourceCreatorRevisionIds.results,
    );
    expect(
      Object.fromEntries(
        Object.entries(restored.files).map(([name, file]) => [name, file.sha256]),
      ),
    ).toEqual(
      Object.fromEntries(
        Object.entries(snapshot.files).map(([name, file]) => [name, file.sha256]),
      ),
    );
    expect(
      await projects.getPublishedDocument(
        testEnv.RESTORE_DB,
        "project-backup-two",
      ),
    ).toMatchObject({ project_id: "project-backup-two" });
    expect(
      await creators.getCreatorDetail(testEnv.RESTORE_DB, "creator-backup"),
    ).toMatchObject({
      creatorId: "creator-backup",
      projects: [{ projectId: "project-backup-one" }, { projectId: "project-backup-two" }],
      unreviewedRepositories: [
        {
          platformRepositoryId: "repository-unreviewed",
          fullName: "backup-org/unreviewed",
        },
      ],
    });
  });

  it("rejects a snapshot whose file no longer matches its hash", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    snapshot.files["projects.jsonl"]!.content += "tampered\n";

    await expect(restoreBackup(testEnv.RESTORE_DB, snapshot)).rejects.toThrow(
      "hash mismatch",
    );
  });

  it("rejects a snapshot whose manifest omits a restore file", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    snapshot.manifest.files = snapshot.manifest.files.filter(
      (file) => file.name !== "projects.jsonl",
    );

    await expect(restoreBackup(testEnv.RESTORE_DB, snapshot)).rejects.toThrow(
      "backup manifest entry missing: projects.jsonl",
    );
  });

  it("rejects manifest counts that disagree with JSONL files", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    snapshot.manifest.counts.projects = 999;

    await expect(restoreBackup(testEnv.RESTORE_DB, snapshot)).rejects.toThrow(
      "backup manifest count mismatch: projects",
    );
  });

  it("rejects a manifest with the wrong revision watermark", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    snapshot.manifest.revision_watermark = "0".repeat(64);

    await expect(restoreBackup(testEnv.RESTORE_DB, snapshot)).rejects.toThrow(
      "backup revision watermark mismatch",
    );
  });

  it("rejects a target containing non-project backup data before inserting", async () => {
    await creators.upsertCreator(testEnv.NONEMPTY_RESTORE_DB, {
      creatorId: "existing-creator",
      type: "person",
      name: "Existing Creator",
    });
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);

    await expect(
      restoreBackup(testEnv.NONEMPTY_RESTORE_DB, snapshot),
    ).rejects.toThrow("restore target database is not empty");
    const projectsAfterFailure = await testEnv.NONEMPTY_RESTORE_DB.prepare(
      "SELECT COUNT(*) AS count FROM projects",
    ).first<{ count: number }>();
    expect(projectsAfterFailure?.count).toBe(0);
  });

  it("rolls back every table when a restore insert fails", async () => {
    const snapshot = await createBackupSnapshot(testEnv.DB, TEST_NOW);
    const creatorsFile = snapshot.files["creators.jsonl"]!;
    creatorsFile.content = `${creatorsFile.content}${creatorsFile.content}`;
    creatorsFile.count = 2;
    creatorsFile.sha256 = await testSha256(creatorsFile.content);
    const creatorsManifest = snapshot.manifest.files.find(
      (file) => file.name === "creators.jsonl",
    )!;
    creatorsManifest.count = creatorsFile.count;
    creatorsManifest.sha256 = creatorsFile.sha256;
    snapshot.manifest.counts.creators = creatorsFile.count;
    snapshot.manifest.revision_watermark = await testSha256(
      `${snapshot.manifest.files.map((file) => `${file.name}:${file.sha256}`).join("\n")}\n`,
    );

    await expect(
      restoreBackup(testEnv.FAILED_RESTORE_DB, snapshot),
    ).rejects.toThrow();
    const projectsAfterFailure = await testEnv.FAILED_RESTORE_DB.prepare(
      "SELECT COUNT(*) AS count FROM projects",
    ).first<{ count: number }>();
    expect(projectsAfterFailure?.count).toBe(0);
  });
});
