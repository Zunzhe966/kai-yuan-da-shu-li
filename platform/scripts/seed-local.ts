#!/usr/bin/env node
/**
 * 本地开发种子：创建编辑 / 审核发布 / 广告身份与固定令牌。
 *
 * 用法：npx tsx scripts/seed-local.ts
 * 必须在 npm run db:migrate:local 之后执行。
 */
import { spawnSync } from "node:child_process";
import { hashBearerToken } from "../src/http/auth";

const ACTORS: Array<{
  actorId: string;
  token: string;
  scopes: string[];
}> = [
  {
    actorId: "local-editor",
    token: "local-editor",
    scopes: ["draft:create", "draft:update", "evidence:add"],
  },
  {
    actorId: "local-reviewer",
    token: "local-reviewer",
    scopes: ["draft:update", "review:approve", "publish", "report:verify", "actors:read"],
  },
  {
    actorId: "local-ad-owner",
    token: "local-ad-owner",
    scopes: ["ad:create", "ad:update", "ad:review", "ad:publish"],
  },
];

async function main(): Promise<void> {
  const statements: string[] = [];
  for (const actor of ACTORS) {
    const now = new Date().toISOString();
    const tokenHash = await hashBearerToken(actor.token);
    statements.push(
      `INSERT INTO actors (actor_id, actor_type, display_name, created_at, updated_at)
       VALUES ('${actor.actorId}', 'agent', '${actor.actorId}', '${now}', '${now}')
       ON CONFLICT(actor_id) DO NOTHING;`,
      `INSERT INTO api_credentials (
         credential_id, actor_id, token_hash, scopes_json, created_at
       ) VALUES (
         'credential-${actor.actorId}', '${actor.actorId}',
         '${tokenHash}', '${JSON.stringify(actor.scopes).replaceAll("'", "''")}', '${now}'
       )
       ON CONFLICT(actor_id, token_hash) DO NOTHING;`,
    );
  }
  const sql = statements.join("\n");
  const result = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--yes", "--command", sql],
    { cwd: process.cwd(), stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error("seed-local failed");
    process.exit(result.status ?? 1);
  }
  console.log(
    JSON.stringify(
      ACTORS.map((actor) => ({
        actor_id: actor.actorId,
        token: actor.token,
        scopes: actor.scopes,
      })),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
