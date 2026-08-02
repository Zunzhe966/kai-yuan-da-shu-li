import { Hono } from "hono";
import type { Bindings } from "./env";

export function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/health", (context) =>
    context.json({
      ok: true,
      service: "kaiyuan-dashuli",
      schema_version: "project-publication-v1",
    }),
  );

  return app;
}
