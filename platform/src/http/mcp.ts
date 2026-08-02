import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import * as z from "zod/v4";
import {
  SECTION_KEYS,
  type ProjectPublication,
  type PublicationSection,
} from "../domain/project";
import type { ActorContext } from "../domain/scopes";
import type { Bindings } from "../env";
import { getCapabilities } from "../services/capabilities";
import {
  CHANGE_REPORT_TYPES,
  getChangeReport,
  intakeChangeReport,
} from "../services/change-reports";
import {
  EDITABLE_PROJECT_GROUPS,
  createProjectDraft,
  submitProjectDraft,
  updateProjectGroup,
  updateProjectSection,
} from "../services/publish";
import { checkRepository } from "../services/repositories";
import { searchProjects } from "../services/search";
import * as creators from "../storage/creators";
import * as projects from "../storage/projects";
import * as workflow from "../storage/workflow";
import { authenticateApiKey } from "./auth";

function result(value: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function asRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

function requiredDraft(draft: workflow.StoredDraft | null): workflow.StoredDraft {
  if (!draft) {
    throw new Error("draft not found");
  }
  return draft;
}

function createMcpServer(db: D1Database, actor: ActorContext | null): McpServer {
  const server = new McpServer(
    { name: "kaiyuan-dashuli", version: "1.0.0" },
    {
      instructions:
        "先查重再新建。所有项目必须保留 project-publication-v1 固定结构；正式发布需要独立审核。",
    },
  );

  server.registerTool(
    "get_capabilities",
    { description: "返回当前身份、scope、工具、限制和审核要求。" },
    async () => result(getCapabilities(actor)),
  );
  server.registerTool(
    "get_catalog_meta",
    { description: "返回当前正式项目和作者数量。" },
    async () => {
      const [projectCount, creatorCount] = await Promise.all([
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM projects WHERE current_revision_id IS NOT NULL",
          )
          .first<{ count: number }>(),
        db.prepare("SELECT COUNT(*) AS count FROM creators").first<{ count: number }>(),
      ]);
      return result({
        schema_version: "project-publication-v1",
        project_count: projectCount?.count ?? 0,
        creator_count: creatorCount?.count ?? 0,
      });
    },
  );
  server.registerTool(
    "search_projects",
    {
      description: "按关键词和结构化条件搜索正式项目。",
      inputSchema: {
        query: z.string().optional(),
        domain: z.array(z.string()).optional(),
        capability: z.array(z.string()).optional(),
        language: z.array(z.string()).optional(),
        license: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (input) => {
      const search = await searchProjects(db, input);
      return result({
        total: search.total,
        items: search.items,
        next_cursor: search.nextCursor,
      });
    },
  );
  server.registerTool(
    "get_project",
    {
      description: "按稳定项目 ID 读取当前正式修订。",
      inputSchema: { project_id: z.string().min(1) },
    },
    async ({ project_id }) => {
      const project = await projects.getPublishedDocument(db, project_id);
      if (!project) throw new Error("project not found");
      return result(asRecord(project));
    },
  );
  server.registerTool(
    "search_creators",
    {
      description: "搜索人物和组织，保持同名身份分离。",
      inputSchema: {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, limit }) =>
      result({ creators: await creators.searchCreators(db, query, limit) }),
  );
  server.registerTool(
    "get_creator",
    {
      description: "读取作者或组织资料及明确的项目角色。",
      inputSchema: { creator_id: z.string().min(1) },
    },
    async ({ creator_id }) => {
      const creator = await creators.getCreatorDetail(db, creator_id);
      if (!creator) throw new Error("creator not found");
      return result(asRecord(creator));
    },
  );
  server.registerTool(
    "find_similar_projects",
    {
      description: "按共同领域和能力查找相似项目，不依赖手写图谱。",
      inputSchema: {
        project_id: z.string().min(1),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ project_id, limit }) => {
      const project = await projects.getPublishedDocument(db, project_id);
      if (!project) throw new Error("project not found");
      const similar = await searchProjects(db, {
        domain: project.discovery.domains.slice(0, 1),
        capability: project.discovery.capabilities.slice(0, 2),
        limit: (limit ?? 6) + 1,
      });
      return result({
        items: similar.items
          .filter((item) => item.project_id !== project_id)
          .slice(0, limit ?? 6),
      });
    },
  );
  server.registerTool(
    "check_repository",
    {
      description: "按稳定平台仓库 ID 查重；授权编辑者可获得短期创建票据。",
      inputSchema: {
        repository_url: z.url(),
        platform_repository_id: z.string().min(1),
      },
    },
    async ({ repository_url, platform_repository_id }) =>
      result(
        asRecord(
          await checkRepository(db, actor, {
            repositoryUrl: repository_url,
            platformRepositoryId: platform_repository_id,
          }),
        ),
      ),
  );
  server.registerTool(
    "report_project_change",
    {
      description: "提交隔离的上游重大变化报告，不直接修改正式记录。",
      inputSchema: {
        project_id: z.string().min(1),
        baseline_revision: z.number().int().min(0),
        report_type: z.enum(CHANGE_REPORT_TYPES),
        upstream_fingerprint: z.string().min(1).max(500),
        evidence_url: z.url(),
        observed_value: z.unknown(),
        observed_at: z.string().min(1),
      },
    },
    async (input) => {
      const report = await intakeChangeReport(db, {
        projectId: input.project_id,
        baselineRevision: input.baseline_revision,
        reportType: input.report_type,
        upstreamFingerprint: input.upstream_fingerprint,
        evidenceUrl: input.evidence_url,
        observedValue: input.observed_value,
        observedAt: input.observed_at,
      });
      return result({
        report_id: report.reportId,
        status: report.status,
        duplicate: report.duplicate,
      });
    },
  );
  server.registerTool(
    "get_public_report_status",
    {
      description: "读取一个公开变化报告的处理状态。",
      inputSchema: { report_id: z.string().min(1) },
    },
    async ({ report_id }) => {
      const report = await getChangeReport(db, report_id);
      if (!report) throw new Error("change report not found");
      return result({
        report_id: report.reportId,
        project_id: report.projectId,
        report_type: report.reportType,
        status: report.status,
        next_attempt_at: report.nextAttemptAt,
        updated_at: report.updatedAt,
      });
    },
  );

  if (actor?.scopes.has("draft:create")) {
    server.registerTool(
      "create_project_draft",
      {
        description: "使用有效查重票据创建完整模板草稿。",
        inputSchema: {
          draft_id: z.string().min(1),
          creation_ticket: z.string().min(1),
          document: z.unknown(),
        },
      },
      async ({ draft_id, creation_ticket, document }) => {
        await createProjectDraft(db, actor, {
          draftId: draft_id,
          creationTicket: creation_ticket,
          document: document as ProjectPublication,
          now: new Date().toISOString(),
        });
        return result({ draft_id, status: "draft" });
      },
    );
  }

  if (actor?.scopes.has("draft:update")) {
    server.registerTool(
      "open_project_workspace",
      {
        description: "读取一个内部草稿工作区。",
        inputSchema: { draft_id: z.string().min(1) },
      },
      async ({ draft_id }) => result(asRecord(requiredDraft(await workflow.getDraft(db, draft_id)))),
    );
    server.registerTool(
      "update_project_fields",
      {
        description: "更新严格模板允许的一个结构化分组。",
        inputSchema: {
          draft_id: z.string().min(1),
          base_revision: z.number().int().min(0),
          group: z.enum(EDITABLE_PROJECT_GROUPS),
          value: z.unknown(),
        },
      },
      async ({ draft_id, base_revision, group, value }) => {
        await updateProjectGroup(
          db,
          actor,
          draft_id,
          base_revision,
          group,
          value,
          new Date().toISOString(),
        );
        return result({ draft_id, group, saved: true });
      },
    );
    server.registerTool(
      "upsert_project_section",
      {
        description: "更新 14 个固定正文栏目中的一个。",
        inputSchema: {
          draft_id: z.string().min(1),
          base_revision: z.number().int().min(0),
          section_key: z.enum(SECTION_KEYS),
          section: z.unknown(),
        },
      },
      async ({ draft_id, base_revision, section_key, section }) => {
        await updateProjectSection(
          db,
          actor,
          draft_id,
          base_revision,
          section_key,
          section as PublicationSection,
          new Date().toISOString(),
        );
        return result({ draft_id, section_key, saved: true });
      },
    );
    server.registerTool(
      "link_creator",
      {
        description: "以明确角色将作者或组织关联到草稿。",
        inputSchema: {
          draft_id: z.string().min(1),
          base_revision: z.number().int().min(0),
          creator_id: z.string().min(1),
          role: z.enum([
            "creator",
            "current_owner",
            "maintainer",
            "organization",
            "foundation",
            "sponsor_of_upstream",
          ]),
          evidence_ids: z.array(z.string()).default([]),
        },
      },
      async ({ draft_id, base_revision, creator_id, role, evidence_ids }) => {
        const draft = requiredDraft(await workflow.getDraft(db, draft_id));
        const attribution = draft.document.attribution.filter(
          (item) => !(item.creator_id === creator_id && item.role === role),
        );
        attribution.push({ creator_id, role, evidence_ids });
        await updateProjectGroup(
          db,
          actor,
          draft_id,
          base_revision,
          "attribution",
          attribution,
          new Date().toISOString(),
        );
        return result({ draft_id, creator_id, role, linked: true });
      },
    );
    server.registerTool(
      "add_evidence",
      {
        description: "向草稿添加或替换一条固定结构证据。",
        inputSchema: {
          draft_id: z.string().min(1),
          base_revision: z.number().int().min(0),
          evidence: z.unknown(),
        },
      },
      async ({ draft_id, base_revision, evidence }) => {
        const draft = requiredDraft(await workflow.getDraft(db, draft_id));
        const entry = evidence as ProjectPublication["evidence"][number];
        const items = draft.document.evidence.filter(
          (item) => item.evidence_id !== entry.evidence_id,
        );
        items.push(entry);
        await updateProjectGroup(
          db,
          actor,
          draft_id,
          base_revision,
          "evidence",
          items,
          new Date().toISOString(),
        );
        return result({ draft_id, evidence_id: entry.evidence_id, saved: true });
      },
    );
    server.registerTool(
      "preview_project",
      {
        description: "读取草稿预览数据，不读取公开正式修订。",
        inputSchema: { draft_id: z.string().min(1) },
      },
      async ({ draft_id }) => {
        const draft = requiredDraft(await workflow.getDraft(db, draft_id));
        return result(asRecord(draft.document));
      },
    );
    server.registerTool(
      "submit_project_for_review",
      {
        description: "将完整且通过校验的草稿提交独立审核。",
        inputSchema: {
          draft_id: z.string().min(1),
          base_revision: z.number().int().min(0),
          risk_level: z.enum(["low", "high"]).default("high"),
        },
      },
      async ({ draft_id, base_revision, risk_level }) => {
        await submitProjectDraft(db, actor, draft_id, {
          submissionId: crypto.randomUUID(),
          baseRevision: base_revision,
          riskLevel: risk_level,
          now: new Date().toISOString(),
        });
        return result({ draft_id, status: "in_review" });
      },
    );
    server.registerTool(
      "revise_project_draft",
      {
        description: "重新打开需修改的草稿工作区。",
        inputSchema: { draft_id: z.string().min(1) },
      },
      async ({ draft_id }) => {
        const draft = requiredDraft(await workflow.getDraft(db, draft_id));
        return result({
          draft_id,
          status: draft.status,
          editable:
            draft.status === "draft" || draft.status === "changes_requested",
        });
      },
    );
    server.registerTool(
      "get_project_history",
      {
        description: "读取项目不可变正式修订历史。",
        inputSchema: { project_id: z.string().min(1) },
      },
      async ({ project_id }) =>
        result({ revisions: await projects.listRevisions(db, project_id) }),
    );
  }
  return server;
}

export function createMcpRouter() {
  const router = new Hono<{ Bindings: Bindings }>();
  router.all("/", async (context) => {
    const requestOrigin = context.req.header("Origin");
    if (requestOrigin && requestOrigin !== new URL(context.req.url).origin) {
      return context.json({ error: "origin_not_allowed" }, 403);
    }
    const actor = await authenticateApiKey(
      context.env.DB,
      context.req.header("Authorization") ?? null,
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createMcpServer(context.env.DB, actor);
    await server.connect(transport);
    return transport.handleRequest(context.req.raw);
  });
  return router;
}
