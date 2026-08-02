import { Hono } from "hono";
import type { Bindings } from "../env";
import { searchInputFromUrl, searchProjects } from "../services/search";
import {
  getPublishedDocument,
  listPublishedProjectIds,
} from "../storage/projects";
import { renderCatalogPage, renderProjectPage } from "../ui/public-pages";

export function createPublicRouter() {
  const router = new Hono<{ Bindings: Bindings }>();

  router.get("/", async (context) => {
    const input = searchInputFromUrl(new URL(context.req.url));
    const result = await searchProjects(context.env.DB, input);
    return context.html(renderCatalogPage(result, input));
  });

  router.get("/projects/:id", async (context) => {
    const project = await getPublishedDocument(context.env.DB, context.req.param("id"));
    return project
      ? context.html(renderProjectPage(project))
      : context.text("Project not found", 404);
  });

  router.get("/robots.txt", (context) => {
    const origin = new URL(context.req.url).origin;
    return context.text(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  });

  router.get("/sitemap.xml", async (context) => {
    const origin = new URL(context.req.url).origin;
    const ids = await listPublishedProjectIds(context.env.DB);
    const urls = ["/", ...ids.map((id) => `/projects/${encodeURIComponent(id)}`)];
    return context.body(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`,
      200,
      { "Content-Type": "application/xml; charset=UTF-8" },
    );
  });

  router.get("/llms.txt", (context) =>
    context.text(`# 开源大梳理\n\n面向人类与智能体的开源项目检索、筛选和深度介绍平台。\n\n- 元数据：/api/v1/meta\n- 搜索：/api/v1/search?q={query}\n- 项目：/api/v1/projects/{id}\n- OpenAPI：/openapi.json\n- MCP：/mcp\n`),
  );

  return router;
}
