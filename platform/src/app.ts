import { Hono } from "hono";
import type { Bindings } from "./env";
import { createApiRouter, OPENAPI_DOCUMENT } from "./http/api";
import { createPublicRouter } from "./http/public";
import { createStudioRouter } from "./http/studio";

export function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "kaiyuan-dashuli",
      schema_version: "project-publication-v1",
    }),
  );
  app.get("/openapi.json", (context) => context.json(OPENAPI_DOCUMENT));
  app.route("/studio", createStudioRouter());
  app.route("/api/v1", createApiRouter());
  app.route("/", createPublicRouter());

  return app;
}
