import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeAll, describe, expect, it } from "vitest";
import { hashBearerToken } from "../src/http/auth";
import type { ActorContext, Scope } from "../src/domain/scopes";
import {
  AD_SLOTS,
  approveAd,
  createAd,
  listAds,
  listPublishedAds,
  publishAd,
  submitAdForReview,
  updateAd,
  type AdInput,
} from "../src/services/ads";
import * as projects from "../src/storage/projects";
import { projectFixture, TEST_NOW } from "./factories";

interface TestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

async function seedActor(
  actorId: string,
  token: string,
  scopes: string[],
): Promise<void> {
  await testEnv.DB.prepare(
    `INSERT INTO actors (actor_id, actor_type, display_name)
     VALUES (?, 'agent', ?)
     ON CONFLICT(actor_id) DO NOTHING`,
  )
    .bind(actorId, actorId)
    .run();
  await testEnv.DB.prepare(
    `INSERT INTO api_credentials (
      credential_id, actor_id, token_hash, scopes_json, created_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(credential_id) DO NOTHING`,
  )
    .bind(
      `credential-${actorId}`,
      actorId,
      await hashBearerToken(token),
      JSON.stringify(scopes),
      TEST_NOW,
    )
    .run();
}

function adInput(adId: string, overrides: Partial<AdInput> = {}): AdInput {
  return {
    adId,
    slotKey: "right-1",
    title: "开源广告",
    landingUrl: "https://example.com/sponsor",
    imageUrl: null,
    scriptHtml: null,
    body: "固定坑位里的自营广告。",
    startsAt: null,
    endsAt: null,
    now: TEST_NOW,
    ...overrides,
  };
}

function actor(actorId: string, scopes: Scope[]): ActorContext {
  return { actorId, scopes: new Set(scopes) };
}

async function connectClient(token?: string): Promise<Client> {
  const client = new Client({ name: "ads-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL("https://example.test/mcp"),
    {
      requestInit: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
      fetch: (input, init) => SELF.fetch(new Request(input, init)),
    },
  );
  await client.connect(transport);
  return client;
}

function structured<T>(result: unknown): T {
  return (result as { structuredContent?: unknown }).structuredContent as T;
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  await seedActor("actor-ad-creator", "ad-creator-token", [
    "ad:create",
    "ad:update",
  ]);
  await seedActor("actor-ad-reviewer", "ad-reviewer-token", [
    "ad:review",
    "ad:publish",
  ]);
  await projects.insertRevision(
    testEnv.DB,
    projectFixture({
      projectId: "project-ad",
      repositoryId: "repository-ad",
      status: "published",
    }),
  );
});

describe("ad entity state machine", () => {
  it("keeps fixed slots stable and renders only published ads", async () => {
    const publisher = actor("actor-ad-creator", ["ad:create", "ad:update"]);
    await createAd(testEnv.DB, publisher, adInput("ad-1"));
    await submitAdForReview(testEnv.DB, publisher, "ad-1");
    await approveAd(testEnv.DB, actor("actor-ad-reviewer", ["ad:review"]), "ad-1");
    await publishAd(
      testEnv.DB,
      actor("actor-ad-reviewer", ["ad:publish"]),
      "ad-1",
    );

    expect(AD_SLOTS).toEqual([
      "left-1",
      "left-2",
      "left-3",
      "left-4",
      "right-1",
      "right-2",
      "right-3",
      "right-4",
      "banner-top",
      "banner-end",
    ]);
    const published = await listPublishedAds(testEnv.DB);
    expect(published.map((ad) => ad.ad_id)).toContain("ad-1");
    expect(published[0]?.slot_key).toBe("right-1");
  });

  it("rejects wrong-state transitions", async () => {
    await expect(
      approveAd(testEnv.DB, actor("actor-ad-reviewer", ["ad:review"]), "ad-1"),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      submitAdForReview(testEnv.DB, actor("actor-ad-creator", ["ad:update"]), "ad-1"),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("requires scopes and valid https landing pages", async () => {
    await expect(
      createAd(testEnv.DB, null, adInput("ad-no-auth")),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      createAd(
        testEnv.DB,
        actor("actor-ad-creator", ["ad:update"]),
        adInput("ad-no-create"),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createAd(
        testEnv.DB,
        actor("actor-ad-creator", ["ad:create"]),
        adInput("ad-bad-url", { landingUrl: "http://example.com" }),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("stores third-party script html without altering fixed layout", async () => {
    await createAd(
      testEnv.DB,
      actor("actor-ad-creator", ["ad:create", "ad:update"]),
      adInput("ad-script", {
        slotKey: "banner-top",
        scriptHtml: '<ins class="adsbygoogle"></ins>',
      }),
    );
    await updateAd(
      testEnv.DB,
      actor("actor-ad-creator", ["ad:update"]),
      "ad-script",
      { scriptHtml: '<ins class="adsbygoogle" data-ad-client="ca-pub-test"></ins>' },
      TEST_NOW,
    );
    const all = await listAds(testEnv.DB);
    const script = all.find((ad) => ad.ad_id === "ad-script");
    expect(script?.script_html).toContain("data-ad-client");
  });
});

describe("ad MCP and public surfaces", () => {
  it("exposes read-only ad slots and published ads to public sessions", async () => {
    const client = await connectClient();
    const slots = structured<{ slots: string[] }>(
      await client.callTool({ name: "get_ad_slots", arguments: {} }),
    );
    const sponsored = structured<{ sponsored_results: unknown[] }>(
      await client.callTool({ name: "list_published_ads", arguments: {} }),
    );

    expect(slots.slots).toContain("banner-top");
    expect(sponsored.sponsored_results.length).toBeGreaterThan(0);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).not.toContain("create_ad");
    await client.close();
  });

  it("runs ad create -> update -> submit -> approve -> publish via MCP scopes", async () => {
    const creator = await connectClient("ad-creator-token");
    await creator.callTool({
      name: "create_ad",
      arguments: {
        slot_key: "right-2",
        title: "MCP 广告",
        landing_url: "https://example.com/mcp-ad",
        body: "通过 MCP 上传的广告内容。",
      },
    });
  const listed = structured<{ ads: Array<{ ad_id: string; title: string; status: string }> }>(
      await creator.callTool({ name: "list_ads", arguments: {} }),
    );
    const created = listed.ads.find((ad) => ad.title === "MCP 广告");
    expect(created).toBeDefined();
    const adId = created!.ad_id;
    await creator.callTool({
      name: "submit_ad_for_review",
      arguments: { ad_id: adId },
    });
    await creator.close();

    const reviewer = await connectClient("ad-reviewer-token");
    await reviewer.callTool({
      name: "approve_ad",
      arguments: { ad_id: adId },
    });
    await reviewer.callTool({
      name: "publish_ad",
      arguments: { ad_id: adId },
    });
    const publicAds = await listPublishedAds(testEnv.DB);
    expect(publicAds.map((ad) => ad.ad_id)).toContain(adId);
    await reviewer.close();
  });

  it("keeps sponsored results separate from organic search results", async () => {
    const response = await SELF.fetch(
      "https://example.test/api/v1/search?q=Aider",
    );
    const payload = (await response.json()) as {
      items: Array<{ project_id: string }>;
      sponsored_results: Array<{ slot_key: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.items[0]?.project_id).toBe("project-ad");
    expect(payload.sponsored_results.length).toBeGreaterThan(0);
    expect(payload.sponsored_results[0]).not.toHaveProperty("project_id");
  });

  it("renders fixed ad rails and top/bottom banners on project pages", async () => {
    const response = await SELF.fetch("https://example.test/projects/project-ad");
    const html = await response.text();
    expect(html).toContain('data-ad-slot="left-1"');
    expect(html).toContain('data-ad-slot="right-1"');
    expect(html).toContain("ad-banner-top");
    expect(html).toContain("ad-banner-end");
  });
});
