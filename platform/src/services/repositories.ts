import type { ActorContext } from "../domain/scopes";
import { WorkflowError } from "./publish";

export interface CheckRepositoryInput {
  repositoryUrl: string;
  platformRepositoryId: string;
  now?: string;
}

export interface RepositoryCheckResult {
  status:
    | "existing_project"
    | "renamed_or_transferred"
    | "possible_duplicate"
    | "new_repository";
  platform: "github";
  platform_repository_id: string;
  canonical_url: string;
  full_name: string;
  existing_project_id: string | null;
  creation_ticket: string | null;
  ticket_expires_at: string | null;
}

export interface GithubRepositoryMetadata {
  platformRepositoryId: string;
  canonicalUrl: string;
  fullName: string;
  defaultBranch: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  isFork: boolean;
  mirrorUrl: string | null;
  archived: boolean;
  disabled: boolean;
  primaryLanguage: string | null;
  license: string | null;
}

export function normalizeGithubRepository(repositoryUrl: string): {
  canonicalUrl: string;
  fullName: string;
} {
  let url: URL;
  try {
    url = new URL(repositoryUrl);
  } catch {
    throw new WorkflowError("repository URL is invalid", 422);
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new WorkflowError("only HTTPS GitHub repositories are supported", 422);
  }
  const parts = url.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2) {
    throw new WorkflowError("repository URL must identify owner and repository", 422);
  }
  const owner = parts[0]!.toLowerCase();
  const repository = parts[1]!.replace(/\.git$/i, "").toLowerCase();
  if (!owner || !repository) {
    throw new WorkflowError("repository URL must identify owner and repository", 422);
  }
  return {
    canonicalUrl: `https://github.com/${owner}/${repository}`,
    fullName: `${owner}/${repository}`,
  };
}

export async function resolveGithubRepository(
  repositoryUrl: string,
  token?: string,
  fetcher: typeof fetch = fetch,
): Promise<GithubRepositoryMetadata> {
  const normalized = normalizeGithubRepository(repositoryUrl);
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "User-Agent": "kaiyuan-dashuli-platform",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  if (token?.trim()) headers.set("Authorization", `Bearer ${token.trim()}`);
  const response = await fetcher(
    `https://api.github.com/repos/${normalized.fullName}`,
    { headers },
  );
  if (!response.ok) {
    throw new WorkflowError(
      response.status === 404
        ? "GitHub repository was not found or is not public"
        : `GitHub repository lookup failed (${response.status})`,
      response.status === 404 ? 422 : 502,
    );
  }
  const value = (await response.json()) as Record<string, unknown>;
  const id = value.id;
  const fullName = typeof value.full_name === "string" ? value.full_name : "";
  const canonicalUrl = typeof value.html_url === "string" ? value.html_url : "";
  if ((typeof id !== "number" && typeof id !== "string") || !fullName || !canonicalUrl) {
    throw new WorkflowError("GitHub repository response is incomplete", 502);
  }
  const textOrNull = (input: unknown): string | null =>
    typeof input === "string" && input.trim() ? input : null;
  const license =
    value.license && typeof value.license === "object"
      ? textOrNull((value.license as Record<string, unknown>).spdx_id)
      : null;
  return {
    platformRepositoryId: String(id),
    canonicalUrl,
    fullName,
    defaultBranch: textOrNull(value.default_branch),
    createdAt: textOrNull(value.created_at),
    updatedAt: textOrNull(value.updated_at),
    pushedAt: textOrNull(value.pushed_at),
    isFork: value.fork === true,
    mirrorUrl: textOrNull(value.mirror_url),
    archived: value.archived === true,
    disabled: value.disabled === true,
    primaryLanguage: textOrNull(value.language),
    license: license === "NOASSERTION" ? null : license,
  };
}

export async function checkRepository(
  db: D1Database,
  actor: ActorContext | null,
  input: CheckRepositoryInput,
): Promise<RepositoryCheckResult> {
  const normalized = normalizeGithubRepository(input.repositoryUrl);
  const repositoryId = input.platformRepositoryId.trim();
  if (!repositoryId) {
    throw new WorkflowError("platform repository ID is required", 422);
  }
  const byIdentity = await db
    .prepare(
      `SELECT project_id, canonical_url FROM repository_sources
       WHERE platform = 'github' AND platform_repository_id = ?`,
    )
    .bind(repositoryId)
    .first<{ project_id: string; canonical_url: string }>();
  if (byIdentity) {
    return {
      status:
        byIdentity.canonical_url === normalized.canonicalUrl
          ? "existing_project"
          : "renamed_or_transferred",
      platform: "github",
      platform_repository_id: repositoryId,
      canonical_url: normalized.canonicalUrl,
      full_name: normalized.fullName,
      existing_project_id: byIdentity.project_id,
      creation_ticket: null,
      ticket_expires_at: null,
    };
  }
  const byUrl = await db
    .prepare(
      `SELECT project_id FROM repository_sources
       WHERE platform = 'github' AND lower(canonical_url) = lower(?)`,
    )
    .bind(normalized.canonicalUrl)
    .first<{ project_id: string }>();
  if (byUrl) {
    return {
      status: "possible_duplicate",
      platform: "github",
      platform_repository_id: repositoryId,
      canonical_url: normalized.canonicalUrl,
      full_name: normalized.fullName,
      existing_project_id: byUrl.project_id,
      creation_ticket: null,
      ticket_expires_at: null,
    };
  }

  let creationTicket: string | null = null;
  let expiresAt: string | null = null;
  if (actor?.scopes.has("draft:create")) {
    const now = input.now ?? new Date().toISOString();
    const existingTicket = await db
      .prepare(
        `SELECT ticket_id, expires_at FROM creation_tickets
         WHERE platform = 'github'
           AND platform_repository_id = ?
           AND issued_to_actor_id = ?
           AND consumed_at IS NULL
           AND expires_at > ?
         ORDER BY expires_at DESC LIMIT 1`,
      )
      .bind(repositoryId, actor.actorId, now)
      .first<{ ticket_id: string; expires_at: string }>();
    if (existingTicket) {
      creationTicket = existingTicket.ticket_id;
      expiresAt = existingTicket.expires_at;
    } else {
      creationTicket = crypto.randomUUID();
      expiresAt = new Date(Date.parse(now) + 15 * 60 * 1000).toISOString();
      await db
        .prepare(
          `INSERT INTO creation_tickets (
            ticket_id, platform, platform_repository_id,
            issued_to_actor_id, expires_at
          ) VALUES (?, 'github', ?, ?, ?)`,
        )
        .bind(creationTicket, repositoryId, actor.actorId, expiresAt)
        .run();
    }
  }
  return {
    status: "new_repository",
    platform: "github",
    platform_repository_id: repositoryId,
    canonical_url: normalized.canonicalUrl,
    full_name: normalized.fullName,
    existing_project_id: null,
    creation_ticket: creationTicket,
    ticket_expires_at: expiresAt,
  };
}
