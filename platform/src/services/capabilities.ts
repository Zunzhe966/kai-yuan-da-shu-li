import type { ActorContext } from "../domain/scopes";

export const PUBLIC_MCP_TOOLS = [
  "get_capabilities",
  "get_catalog_meta",
  "search_projects",
  "get_project",
  "search_creators",
  "get_creator",
  "find_similar_projects",
  "check_repository",
  "report_project_change",
  "get_public_report_status",
] as const;

export const EDITOR_MCP_TOOLS = [
  "create_project_draft",
  "open_project_workspace",
  "update_project_fields",
  "upsert_project_section",
  "link_creator",
  "add_evidence",
  "preview_project",
  "submit_project_for_review",
  "revise_project_draft",
  "get_project_history",
] as const;

export function getCapabilities(actor: ActorContext | null) {
  const allowedActions: string[] = [...PUBLIC_MCP_TOOLS];
  if (actor?.scopes.has("draft:create")) {
    allowedActions.push("create_project_draft");
  }
  if (actor?.scopes.has("draft:update")) {
    allowedActions.push(
      ...EDITOR_MCP_TOOLS.filter((tool) => tool !== "create_project_draft"),
    );
  }
  return {
    actor_id: actor?.actorId ?? "public",
    scopes: actor ? [...actor.scopes].sort() : [],
    schema_version: "project-publication-v1",
    allowed_actions: allowedActions,
    limits: {
      search_results_per_call: 50,
      draft_document_bytes: 1_000_000,
    },
    review_requirements: {
      all_publication_requires_approval: true,
      high_risk_requires_independent_reviewer: true,
      direct_published_writes: false,
    },
  };
}
