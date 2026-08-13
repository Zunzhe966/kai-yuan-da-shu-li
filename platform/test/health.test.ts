import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("health", () => {
  it("reports the launch service and schema", async () => {
    const response = await SELF.fetch("https://example.test/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "kaiyuan-dashuli",
      schema_version: "project-publication-v1",
      deployment_environment: "unknown",
    });
  });
});
