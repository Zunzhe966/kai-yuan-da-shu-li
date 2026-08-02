export const SCOPES = [
  "draft:create",
  "draft:update",
  "review:approve",
  "publish",
  "evidence:add",
  "report:verify",
  "backup:read",
] as const;

export type Scope = (typeof SCOPES)[number];

export interface ActorContext {
  actorId: string;
  scopes: ReadonlySet<Scope>;
}

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}
