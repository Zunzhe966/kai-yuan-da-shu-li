import { Hono } from "hono";
import type { Bindings } from "../env";
import { SECTION_KEYS, type SectionKey } from "../domain/project";
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
import { listPublishedAds } from "../services/ads";
import {
  renderCatalogPage,
  renderCreatorPage,
  renderProjectPage,
  renderProjectSectionPage,
} from "../ui/public-pages";

function adsToMap(ads: { slot_key: string; title: string; landing_url: string; image_url: string | null; script_html: string; body: string }[]): Record<string, { title: string; landingUrl: string; imageUrl: string | null; scriptHtml: string; body: string }> {
  const map: Record<string, { title: string; landingUrl: string; imageUrl: string | null; scriptHtml: string; body: string }> = {};
  for (const ad of ads) {
    map[ad.slot_key] = { title: ad.title, landingUrl: ad.landing_url, imageUrl: ad.image_url, scriptHtml: ad.script_html, body: ad.body };
  }
  return map;
}

export function createPublicRouter() {
  const router = new Hono<{ Bindings: Bindings }>();

  router.get("/", async (context) => {
    const input = searchInputFromUrl(new URL(context.req.url));
    const [result, creatorResults, ads] = await Promise.all([
      input.entityType === "creator"
        ? Promise.resolve({ total: 0, items: [], nextCursor: null })
        : searchProjects(context.env.DB, input),
      input.entityType === "project"
        ? Promise.resolve([])
        : searchCreators(context.env.DB, input.query),
      listPublishedAds(context.env.DB),
    ]);
    return context.html(renderCatalogPage(result, input, creatorResults, adsToMap(ads)));
  });

  router.get("/creators/:id", async (context) => {
    const [creator, ads] = await Promise.all([
      getCreatorDetail(context.env.DB, context.req.param("id")),
      listPublishedAds(context.env.DB),
    ]);
    return creator
      ? context.html(renderCreatorPage(creator, adsToMap(ads)))
      : context.text("Creator not found", 404);
  });

  router.get("/projects/:id", async (context) => {
    const [project, knownCreatorIds, ads] = await Promise.all([
      getPublishedDocument(context.env.DB, context.req.param("id")),
      listCreatorIds(context.env.DB).then((ids) => new Set(ids)),
      listPublishedAds(context.env.DB),
    ]);
    if (!project) {
      return context.text("Project not found", 404);
    }
    return context.html(renderProjectPage(project, { knownCreatorIds, ads: adsToMap(ads) }));
  });

  router.get("/projects/:id/sections/:section", async (context) => {
    const [project, knownCreatorIds, ads] = await Promise.all([
      getPublishedDocument(context.env.DB, context.req.param("id")),
      listCreatorIds(context.env.DB).then((ids) => new Set(ids)),
      listPublishedAds(context.env.DB),
    ]);
    if (!project) {
      return context.text("Project not found", 404);
    }
    const section = context.req.param("section");
    if (section !== "evidence" && !(SECTION_KEYS as readonly string[]).includes(section)) {
      return context.text("Section not found", 404);
    }
    return context.html(renderProjectSectionPage(project, section as SectionKey | "evidence", {
      knownCreatorIds,
      ads: adsToMap(ads),
    }));
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
