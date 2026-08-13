import { isScope, type ActorContext, type Scope } from "../domain/scopes";

interface CredentialRow {
  actor_id: string;
  scopes_json: string;
}

export async function hashBearerToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function parseScopes(value: string): Set<Scope> {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("stored credential scopes are invalid");
  }
  return new Set(parsed.filter(isScope));
}

export async function authenticateApiKey(
  db: D1Database,
  authorization: string | null,
  now = new Date().toISOString(),
): Promise<ActorContext | null> {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) {
    return null;
  }
  const tokenHash = await hashBearerToken(token);
  const row = await db
    .prepare(
      `SELECT c.actor_id, c.scopes_json
       FROM api_credentials c
       JOIN actors a ON a.actor_id = c.actor_id
       WHERE c.token_hash = ?
         AND c.revoked_at IS NULL
         AND (c.expires_at IS NULL OR c.expires_at > ?)
         AND a.status = 'active'`,
    )
    .bind(tokenHash, now)
    .first<CredentialRow>();
  return row ? { actorId: row.actor_id, scopes: parseScopes(row.scopes_json) } : null;
}
