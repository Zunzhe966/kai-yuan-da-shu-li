import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
  classifyReportRisk,
  getChangeReport,
  intakeChangeReport,
  processPendingChangeReports,
} from "../src/services/change-reports";
import * as projects from "../src/storage/projects";
import { projectFixture, TEST_NOW } from "./factories";

interface TestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

function reportInput(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "project-change-report",
    baselineRevision: 1,
    reportType: "release_changed" as const,
    upstreamFingerprint: "release:v2.0.0",
    evidenceUrl: "https://github.com/example/project/releases/tag/v2.0.0",
    observedValue: { release: "v2.0.0" },
    observedAt: TEST_NOW,
    ...overrides,
  };
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  await projects.insertRevision(
    testEnv.DB,
    projectFixture({
      projectId: "project-change-report",
      repositoryId: "repository-change-report",
      status: "published",
    }),
  );
});

describe("public change report intake", () => {
  it("accepts an isolated report without mutating the published project", async () => {
    const before = await projects.listRevisions(testEnv.DB, "project-change-report");
    const response = await SELF.fetch(
      "https://example.test/api/v1/change-reports",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "project-change-report",
          baseline_revision: 1,
          report_type: "repository_archived",
          upstream_fingerprint: "archive:true",
          evidence_url: "https://github.com/example/project",
          observed_value: { archived: true },
          observed_at: TEST_NOW,
        }),
      },
    );
    const payload = (await response.json()) as {
      report_id: string;
      status: string;
    };

    expect(response.status).toBe(202);
    expect(payload.status).toBe("received");
    expect(await projects.listRevisions(testEnv.DB, "project-change-report")).toHaveLength(
      before.length,
    );
  });

  it("deduplicates by project, type and upstream fingerprint", async () => {
    const first = await intakeChangeReport(testEnv.DB, reportInput(), TEST_NOW);
    const second = await intakeChangeReport(testEnv.DB, reportInput(), TEST_NOW);

    expect(second.reportId).toBe(first.reportId);
    expect(second.duplicate).toBe(true);
    const count = await testEnv.DB.prepare(
      `SELECT COUNT(*) AS count FROM change_reports
       WHERE project_id = 'project-change-report'
         AND report_type = 'release_changed'
         AND upstream_fingerprint = 'release:v2.0.0'`,
    ).first<{ count: number }>();
    expect(count?.count).toBe(1);
  });

  it.each([
    "http://github.com/example/project",
    "https://localhost/report",
    "https://127.0.0.1/report",
    "https://192.168.1.2/report",
  ])("rejects unsafe evidence URL %s", async (evidenceUrl) => {
    await expect(
      intakeChangeReport(
        testEnv.DB,
        reportInput({
          upstreamFingerprint: `unsafe:${evidenceUrl}`,
          evidenceUrl,
        }),
        TEST_NOW,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("scheduled report verification", () => {
  it("classifies mechanical and editorial changes deterministically", () => {
    expect(classifyReportRisk("release_changed")).toBe("low");
    expect(classifyReportRisk("repository_redirected")).toBe("low");
    expect(classifyReportRisk("license_changed")).toBe("high");
    expect(classifyReportRisk("ownership_changed")).toBe("high");
    expect(classifyReportRisk("summary_mismatch")).toBe("high");
  });

  it("routes a verified high-risk report to review without publishing", async () => {
    const created = await intakeChangeReport(
      testEnv.DB,
      reportInput({
        reportType: "license_changed",
        upstreamFingerprint: "license:GPL-3.0",
        observedValue: { license: "GPL-3.0" },
      }),
      TEST_NOW,
    );
    const before = await projects.listRevisions(testEnv.DB, "project-change-report");

    await processPendingChangeReports(testEnv.DB, {
      now: TEST_NOW,
      verifyEvidence: async () => ({ verified: true, note: "official license" }),
    });

    expect((await getChangeReport(testEnv.DB, created.reportId))?.status).toBe(
      "needs_review",
    );
    expect(await projects.listRevisions(testEnv.DB, "project-change-report")).toHaveLength(
      before.length,
    );
  });

  it("schedules a retry when upstream verification fails", async () => {
    const created = await intakeChangeReport(
      testEnv.DB,
      reportInput({
        reportType: "repository_missing",
        upstreamFingerprint: "missing:timeout",
      }),
      TEST_NOW,
    );

    await processPendingChangeReports(testEnv.DB, {
      now: TEST_NOW,
      verifyEvidence: async (report) => {
        if (report.reportId === created.reportId) throw new Error("upstream timeout");
        return { verified: true };
      },
    });

    const stored = await getChangeReport(testEnv.DB, created.reportId);
    expect(stored?.status).toBe("retry");
    expect(stored?.nextAttemptAt).toBe("2026-08-02T01:00:00.000Z");
  });
});
