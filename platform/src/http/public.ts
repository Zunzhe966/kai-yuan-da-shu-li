import { Hono } from "hono";
import type { Bindings } from "../env";
import { searchInputFromUrl, searchProjects } from "../services/search";
import {
  getCreatorDetail,
  listCreatorIds,
  searchCreators,
} from "../storage/creators";
import {
  getPublishedDocument,
  listPublishedProjectIds,
} from "../storage/projects";
import {
  renderCatalogPage,
  renderCreatorPage,
  renderProjectPage,
} from "../ui/public-pages";

export function createPublicRouter() {
  const router = new Hono<{ Bindings: Bindings }>();

  router.get("/", async (context) => {
    const input = searchInputFromUrl(new URL(context.req.url));
    const [result, creatorResults] = await Promise.all([
      input.entityType === "creator"
        ? Promise.resolve({ total: 0, items: [], nextCursor: null })
        : searchProjects(context.env.DB, input),
      input.entityType === "project"
        ? Promise.resolve([])
        : searchCreators(context.env.DB, input.query),
    ]);
    return context.html(renderCatalogPage(result, input, creatorResults));
  });

  router.get("/creators/:id", async (context) => {
    const creator = await getCreatorDetail(context.env.DB, context.req.param("id"));
    return creator
      ? context.html(renderCreatorPage(creator))
      : context.text("Creator not found", 404);
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
    const [ids, creatorIds] = await Promise.all([
      listPublishedProjectIds(context.env.DB),
      listCreatorIds(context.env.DB),
    ]);
    const urls = [
      "/",
      ...ids.map((id) => `/projects/${encodeURIComponent(id)}`),
      ...creatorIds.map((id) => `/creators/${encodeURIComponent(id)}`),
    ];
    return context.body(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`,
      200,
      { "Content-Type": "application/xml; charset=UTF-8" },
    );
  });

  router.get("/llms.txt", (context) =>
    context.text(`# 开源大梳理\n\n面向人类与智能体的开源项目检索、筛选和深度介绍平台。\n\n- 元数据：/api/v1/meta\n- 搜索：/api/v1/search?q={query}&entity={project|creator|all}\n- 项目：/api/v1/projects/{id}\n- 作者与组织：/api/v1/creators/{id}\n- OpenAPI：/openapi.json\n- MCP：/mcp\n`),
  );

  return router;
}
