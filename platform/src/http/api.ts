import { Hono } from "hono";
import type { Bindings } from "../env";
import { searchInputFromUrl, searchProjects } from "../services/search";
import { getPublishedDocument } from "../storage/projects";

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
    const result = await searchProjects(context.env.DB, input);
    return context.json({
      total: result.total,
      items: result.items,
      next_cursor: result.nextCursor,
    });
  });

  router.get("/projects/:id", async (context) => {
    const project = await getPublishedDocument(context.env.DB, context.req.param("id"));
    return project
      ? context.json(project)
      : context.json({ error: "project_not_found" }, 404);
  });

  return router;
}
