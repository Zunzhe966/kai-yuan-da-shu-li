import { describe, expect, it, vi } from "vitest";
import {
  normalizeGithubRepository,
  resolveGithubRepository,
} from "../src/services/repositories";

describe("GitHub repository resolution", () => {
  it("normalizes supported public GitHub repository URLs", () => {
    expect(
      normalizeGithubRepository("https://github.com/Cloudflare/containers.git"),
    ).toEqual({
      canonicalUrl: "https://github.com/cloudflare/containers",
      fullName: "cloudflare/containers",
    });
  });

  it("maps a missing or private repository to a safe validation error", async () => {
    await expect(
      resolveGithubRepository(
        "https://github.com/example/missing",
        undefined,
        vi.fn(async () => new Response(null, { status: 404 })),
      ),
    ).rejects.toMatchObject({
      message: "GitHub repository was not found or is not public",
      status: 422,
    });
  });

  it("maps a GitHub service failure without exposing its token", async () => {
    const fetcher = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 403 }),
    );

    await expect(
      resolveGithubRepository(
        "https://github.com/example/rate-limited",
        "secret-github-token",
        fetcher,
      ),
    ).rejects.toMatchObject({
      message: "GitHub repository lookup failed (403)",
      status: 502,
    });
    const request = fetcher.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get("Authorization")).toBe(
      "Bearer secret-github-token",
    );
    expect(fetcher.mock.calls.join(" ")).not.toContain("secret-github-token");
  });
});
