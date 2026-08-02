import { Hono } from "hono";
import { SECTION_KEYS, type FieldState, type SectionKey } from "../domain/project";
import type { ActorContext } from "../domain/scopes";
import type { Bindings } from "../env";
import {
  approveSubmission,
  createProjectDraft,
  EDITABLE_PROJECT_GROUPS,
  publishApprovedDraft,
  submitProjectDraft,
  updateProjectGroup,
  updateProjectSection,
  WorkflowError,
  type EditableProjectGroup,
} from "../services/publish";
import { buildNativeProjectDraft } from "../services/native-project";
import {
  listChangeReports,
  listProjectChangeReports,
} from "../services/change-reports";
import { listStudioActors } from "../services/actors";
import {
  checkRepository,
  resolveGithubRepository,
} from "../services/repositories";
import { authenticateApiKey } from "./auth";
import * as workflow from "../storage/workflow";
import { renderProjectPage } from "../ui/public-pages";
import {
  renderStudioNewProject,
  renderStudioQueue,
  renderStudioReports,
  renderStudioActors,
  renderStudioWorkspace,
  type WorkspaceTab,
} from "../ui/studio-pages";

interface StudioVariables {
  actor: ActorContext;
}

const FIELD_STATES: FieldState[] = [
  "verified",
  "inferred",
  "unknown",
  "conflicting",
  "stale",
  "not_applicable",
];

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

const WORKSPACE_TABS: WorkspaceTab[] = [
  "identity",
  "repositories",
  "creators",
  "discovery",
  "card",
  "sections",
  "evidence",
  "reports",
  "diff",
  "preview",
  "review",
];

const GROUP_BY_TAB: Partial<Record<WorkspaceTab, EditableProjectGroup>> = {
  identity: "identity",
  repositories: "repository_sources",
  creators: "attribution",
  discovery: "discovery",
  card: "card",
  evidence: "evidence",
};

function isWorkspaceTab(value: string): value is WorkspaceTab {
  return WORKSPACE_TABS.includes(value as WorkspaceTab);
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createStudioRouter() {
  const router = new Hono<{ Bindings: Bindings; Variables: StudioVariables }>();

  router.onError((error, context) => {
    if (error instanceof WorkflowError) {
      return context.text(
        error.message,
        error.status as 401 | 403 | 404 | 409 | 422,
      );
    }
    throw error;
  });

  router.use("*", async (context, next) => {
    const actor = await authenticateApiKey(
      context.env.DB,
      context.req.header("Authorization") ?? null,
    );
    if (!actor) {
      return context.text("Authentication required", 401, {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Bearer realm="kaiyuan-dashuli-studio"',
      });
    }
    context.set("actor", actor);
    await next();
    context.header("Cache-Control", "no-store");
  });

  router.get("/", async (context) =>
    context.html(
      renderStudioQueue(
        await workflow.listDrafts(context.env.DB),
        context.get("actor"),
      ),
    ),
  );

  router.get("/projects/new", (context) =>
    context.get("actor").scopes.has("draft:create")
      ? context.html(renderStudioNewProject())
      : context.text("Missing scope: draft:create", 403),
  );

  router.post("/projects/new", async (context) => {
    const actor = context.get("actor");
    if (!actor.scopes.has("draft:create")) {
      return context.text("Missing scope: draft:create", 403);
    }
    const body = await context.req.parseBody();
    const projectId = String(body.project_id ?? "").trim();
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(projectId)) {
      throw new WorkflowError("project ID must be a lowercase slug", 422);
    }
    const now = new Date().toISOString();
    const repository = await resolveGithubRepository(
      String(body.repository_url ?? ""),
      context.env.GITHUB_API_TOKEN,
    );
    const checked = await checkRepository(context.env.DB, actor, {
      repositoryUrl: repository.canonicalUrl,
      platformRepositoryId: repository.platformRepositoryId,
      now,
    });
    if (checked.status !== "new_repository" || !checked.creation_ticket) {
      throw new WorkflowError(
        checked.existing_project_id
          ? `repository already belongs to project ${checked.existing_project_id}`
          : "repository cannot be created because it may be a duplicate",
        409,
      );
    }
    const text = (name: string): string => String(body[name] ?? "").trim();
    const document = buildNativeProjectDraft({
      projectId,
      name: text("name"),
      chineseName: text("chinese_name") || null,
      summary: text("summary"),
      useWhen: text("use_when"),
      avoidWhen: text("avoid_when"),
      primaryCategory: text("primary_category"),
      domain: text("domain") || null,
      actorId: actor.actorId,
      repository,
      now,
    });
    const draftId = `draft-${crypto.randomUUID()}`;
    await createProjectDraft(context.env.DB, actor, {
      draftId,
      creationTicket: checked.creation_ticket,
      document,
      now,
    });
    return context.redirect(`/studio/projects/${encodeURIComponent(draftId)}`, 303);
  });

  router.get("/projects/:id/preview", async (context) => {
    const draft = await workflow.getDraft(context.env.DB, context.req.param("id"));
    return draft
      ? context.html(
          renderProjectPage(draft.document, {
            studioBackUrl: `/studio/projects/${encodeURIComponent(draft.draftId)}`,
          }),
        )
      : context.text("Draft not found", 404);
  });

  router.get("/projects/:id/tabs/:tab", async (context) => {
    const tab = context.req.param("tab");
    if (!isWorkspaceTab(tab) || tab === "preview" || tab === "sections") {
      return context.text("Unknown workspace tab", 404);
    }
    const draft = await workflow.getDraft(context.env.DB, context.req.param("id"));
    if (!draft) return context.text("Draft not found", 404);
    const reports = tab === "reports"
      ? await listProjectChangeReports(
          context.env.DB,
          draft.projectId ?? draft.document.project_id,
        )
      : [];
    return context.html(
      renderStudioWorkspace(draft, context.get("actor"), "overview", tab, reports),
    );
  });

  router.post("/projects/:id/tabs/:tab", async (context) => {
    const tab = context.req.param("tab");
    if (!isWorkspaceTab(tab)) {
      return context.text("Unknown workspace tab", 404);
    }
    const group = GROUP_BY_TAB[tab];
    if (!group || !EDITABLE_PROJECT_GROUPS.includes(group)) {
      return context.text("Workspace tab is read-only", 405);
    }
    const body = await context.req.parseBody();
    let value: unknown;
    try {
      value = JSON.parse(String(body.value_json ?? "")) as unknown;
    } catch {
      return context.text("Invalid JSON value", 422);
    }
    await updateProjectGroup(
      context.env.DB,
      context.get("actor"),
      context.req.param("id"),
      Number(body.base_revision),
      group,
      value,
      new Date().toISOString(),
    );
    return context.redirect(
      `/studio/projects/${encodeURIComponent(context.req.param("id"))}/tabs/${tab}`,
      303,
    );
  });

  router.get("/projects/:id/sections/:section", async (context) => {
    const sectionKey = context.req.param("section");
    if (!isSectionKey(sectionKey)) {
      return context.text("Unknown fixed section", 404);
    }
    const draft = await workflow.getDraft(context.env.DB, context.req.param("id"));
    return draft
      ? context.html(renderStudioWorkspace(draft, context.get("actor"), sectionKey))
      : context.text("Draft not found", 404);
  });

  router.post("/projects/:id/sections/:section", async (context) => {
    const sectionKey = context.req.param("section");
    if (!isSectionKey(sectionKey)) {
      return context.text("Unknown fixed section", 404);
    }
    const body = await context.req.parseBody();
    const state = String(body.state ?? "");
    const confidence = String(body.confidence ?? "");
    if (!FIELD_STATES.includes(state as FieldState)) {
      return context.text("Invalid section state", 422);
    }
    if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
      return context.text("Invalid confidence", 422);
    }
    try {
      await updateProjectSection(
        context.env.DB,
        context.get("actor"),
        context.req.param("id"),
        Number(body.base_revision),
        sectionKey,
        {
          state: state as FieldState,
          summary: String(body.summary ?? ""),
          body: String(body.body ?? ""),
          key_points: lines(String(body.key_points ?? "")),
          evidence_ids: lines(String(body.evidence_ids ?? "")),
          confidence,
          updated_at: new Date().toISOString(),
        },
        new Date().toISOString(),
      );
      return context.redirect(
        `/studio/projects/${encodeURIComponent(context.req.param("id"))}/sections/${sectionKey}`,
        303,
      );
    } catch (error) {
      if (error instanceof WorkflowError) {
        return context.text(error.message, error.status as 401 | 403 | 404 | 409 | 422);
      }
      throw error;
    }
  });

  router.post("/projects/:id/actions/submit", async (context) => {
    const draftId = context.req.param("id");
    const draft = await workflow.getDraft(context.env.DB, draftId);
    if (!draft) {
      return context.text("Draft not found", 404);
    }
    await submitProjectDraft(context.env.DB, context.get("actor"), draftId, {
      submissionId: crypto.randomUUID(),
      baseRevision: draft.baseRevision,
      riskLevel: "high",
      now: new Date().toISOString(),
    });
    return context.redirect(
      `/studio/projects/${encodeURIComponent(draftId)}/tabs/review`,
      303,
    );
  });

  router.post("/projects/:id/actions/approve", async (context) => {
    const draftId = context.req.param("id");
    const submission = await workflow.getLatestSubmissionForDraft(
      context.env.DB,
      draftId,
    );
    if (!submission) {
      return context.text("Submission not found", 404);
    }
    await approveSubmission(
      context.env.DB,
      context.get("actor"),
      submission.submissionId,
      { reviewId: crypto.randomUUID(), now: new Date().toISOString() },
    );
    return context.redirect(
      `/studio/projects/${encodeURIComponent(draftId)}/tabs/review`,
      303,
    );
  });

  router.post("/projects/:id/actions/publish", async (context) => {
    const draftId = context.req.param("id");
    await publishApprovedDraft(context.env.DB, context.get("actor"), draftId, {
      auditEventId: crypto.randomUUID(),
      now: new Date().toISOString(),
      reason: "Published from internal Studio after approval",
    });
    return context.redirect(
      `/studio/projects/${encodeURIComponent(draftId)}/tabs/review`,
      303,
    );
  });

  router.get("/projects/:id", async (context) => {
    const draft = await workflow.getDraft(context.env.DB, context.req.param("id"));
    return draft
      ? context.html(
          renderStudioWorkspace(draft, context.get("actor"), "overview", "identity"),
        )
      : context.text("Draft not found", 404);
  });

  router.get("/reports", async (context) =>
    context.html(renderStudioReports(await listChangeReports(context.env.DB))),
  );
  router.get("/actors", async (context) =>
    context.html(renderStudioActors(await listStudioActors(context.env.DB))),
  );

  return router;
}
