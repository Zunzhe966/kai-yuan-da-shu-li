import { isScope, type Scope } from "../domain/scopes";

interface ActorCredentialRow {
  actor_id: string;
  actor_type: "human" | "agent" | "service";
  display_name: string;
  status: "active" | "suspended" | "revoked";
  scopes_json: string | null;
  credential_revoked_at: string | null;
  credential_expires_at: string | null;
}

export interface StudioActor {
  actorId: string;
  actorType: ActorCredentialRow["actor_type"];
  displayName: string;
  status: ActorCredentialRow["status"];
  scopes: Scope[];
  activeCredentialCount: number;
}

export async function listStudioActors(
  db: D1Database,
  now = new Date().toISOString(),
): Promise<StudioActor[]> {
  const result = await db
    .prepare(
      `SELECT a.actor_id, a.actor_type, a.display_name, a.status,
              c.scopes_json, c.revoked_at AS credential_revoked_at,
              c.expires_at AS credential_expires_at
       FROM actors a
       LEFT JOIN api_credentials c ON c.actor_id = a.actor_id
       ORDER BY a.actor_id`,
    )
    .all<ActorCredentialRow>();
  const actors = new Map<string, StudioActor>();
  for (const row of result.results) {
    let actor = actors.get(row.actor_id);
    if (!actor) {
      actor = {
        actorId: row.actor_id,
        actorType: row.actor_type,
        displayName: row.display_name,
        status: row.status,
        scopes: [],
        activeCredentialCount: 0,
      };
      actors.set(row.actor_id, actor);
    }
    const activeCredential =
      row.scopes_json !== null &&
      row.credential_revoked_at === null &&
      (row.credential_expires_at === null || row.credential_expires_at > now);
    if (!activeCredential) continue;
    actor.activeCredentialCount += 1;
    const scopes = JSON.parse(row.scopes_json!) as unknown;
    if (!Array.isArray(scopes)) continue;
    for (const scope of scopes) {
      if (typeof scope === "string" && isScope(scope) && !actor.scopes.includes(scope)) {
        actor.scopes.push(scope);
      }
    }
  }
  for (const actor of actors.values()) actor.scopes.sort();
  return [...actors.values()];
}
