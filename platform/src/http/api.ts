import { Hono } from "hono";
import type { Bindings } from "../env";
import { searchInputFromUrl, searchProjects } from "../services/search";
import { getCreatorDetail, searchCreators } from "../storage/creators";
import { getPublishedDocument } from "../storage/projects";
import {
  getChangeReport,
  intakeChangeReport,
  type ChangeReportType,
} from "../services/change-reports";
import { WorkflowError } from "../services/publish";

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "开源大梳理 API",
    version: "1.0.0",
    description: "公开项目检索与已发布正文读取 API。",
  },
  paths: {
    "/api/v1/meta": { get: { summary: "目录元数据" } },
    "/api/v1/search": { get: { summary: "搜索项目" } },
    "/api/v1/projects/{id}": { get: { summary: "读取项目正式修订" } },
    "/api/v1/creators/{id}": { get: { summary: "读取作者或组织资料" } },
    "/api/v1/change-reports": { post: { summary: "提交项目变化报告" } },
    "/api/v1/change-reports/{id}": { get: { summary: "读取变化报告状态" } },
  },
};

export function createApiRouter() {
  const router = new Hono<{ Bindings: Bindings }>();

  router.get("/meta", async (context) => {
    const count = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM projects WHERE current_revision_id IS NOT NULL",
    ).first<{ count: number }>();
    return context.json({
      service: "kaiyuan-dashuli",
      schema_version: "project-publication-v1",
      project_count: count?.count ?? 0,
      capabilities: ["project_search", "project_detail", "structured_filters"],
    });
  });

  router.get("/search", async (context) => {
    const input = searchInputFromUrl(new URL(context.req.url));
    const [result, creators] = await Promise.all([
      input.entityType === "creator"
        ? Promise.resolve({ total: 0, items: [], nextCursor: null })
        : searchProjects(context.env.DB, input),
      input.entityType === "project"
        ? Promise.resolve([])
        : searchCreators(context.env.DB, input.query),
    ]);
    return context.json({
      total: result.total,
      items: result.items,
      next_cursor: result.nextCursor,
      creators: creators.map((creator) => ({
        creator_id: creator.creatorId,
        type: creator.type,
        name: creator.name,
        display_name: creator.displayName,
        biography: creator.biography,
        aliases: creator.aliases,
        official_sites: creator.officialSites,
        social_profiles: creator.socialProfiles,
        code_host_identities: creator.codeHostIdentities,
      })),
    });
  });

  router.get("/projects/:id", async (context) => {
    const project = await getPublishedDocument(context.env.DB, context.req.param("id"));
    return project
      ? context.json(project)
      : context.json({ error: "project_not_found" }, 404);
  });

  router.get("/creators/:id", async (context) => {
    const creator = await getCreatorDetail(context.env.DB, context.req.param("id"));
    return creator
      ? context.json({
          creator_id: creator.creatorId,
          type: creator.type,
          name: creator.name,
          display_name: creator.displayName,
          biography: creator.biography,
          aliases: creator.aliases,
          official_sites: creator.officialSites,
          social_profiles: creator.socialProfiles,
          code_host_identities: creator.codeHostIdentities,
          projects: creator.projects.map((item) => ({
            project_id: item.projectId,
            role: item.role,
            evidence_ids: item.evidenceIds,
            project: item.project,
          })),
          unreviewed_repositories: creator.unreviewedRepositories.map((item) => ({
            platform: item.platform,
            platform_repository_id: item.platformRepositoryId,
            full_name: item.fullName,
            canonical_url: item.canonicalUrl,
            summary: item.summary,
            observed_at: item.observedAt,
          })),
        })
      : context.json({ error: "creator_not_found" }, 404);
  });

  router.post("/change-reports", async (context) => {
    let body: Record<string, unknown>;
    try {
      body = await context.req.json<Record<string, unknown>>();
    } catch {
      return context.json({ error: "invalid_json" }, 400);
    }
    try {
      const report = await intakeChangeReport(context.env.DB, {
        projectId: String(body.project_id ?? ""),
        baselineRevision: Number(body.baseline_revision),
        reportType: String(body.report_type ?? "") as ChangeReportType,
        upstreamFingerprint: String(body.upstream_fingerprint ?? ""),
        evidenceUrl: String(body.evidence_url ?? ""),
        observedValue: body.observed_value,
        observedAt: String(body.observed_at ?? ""),
      });
      return context.json(
        {
          report_id: report.reportId,
          status: report.status,
          duplicate: report.duplicate,
        },
        report.duplicate ? 200 : 202,
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        return context.json(
          { error: error.message },
          error.status as 404 | 422,
        );
      }
      throw error;
    }
  });

  router.get("/change-reports/:id", async (context) => {
    const report = await getChangeReport(context.env.DB, context.req.param("id"));
    return report
      ? context.json({
          report_id: report.reportId,
          project_id: report.projectId,
          report_type: report.reportType,
          status: report.status,
          next_attempt_at: report.nextAttemptAt,
          updated_at: report.updatedAt,
        })
      : context.json({ error: "change_report_not_found" }, 404);
  });

  return router;
}
