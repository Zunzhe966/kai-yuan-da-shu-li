import type { ProjectPublication } from "../domain/project";
import type { ActorContext, Scope } from "../domain/scopes";
import { validateProject } from "../domain/validate";
import * as projects from "../storage/projects";
import * as workflow from "../storage/workflow";

export const TRANSITIONS = {
  draft: ["in_review"],
  in_review: ["changes_requested", "approved"],
  changes_requested: ["in_review"],
  approved: ["published"],
  published: ["stale", "archived"],
  stale: ["in_review", "archived"],
  archived: ["in_review"],
} as const;

export class WorkflowError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

function requireScope(
  actor: ActorContext | null,
  scope: Scope,
): asserts actor is ActorContext {
  if (!actor) {
    throw new WorkflowError("authentication required", 401);
  }
  if (!actor.scopes.has(scope)) {
    throw new WorkflowError(`missing scope: ${scope}`, 403);
  }
}

export interface CreateProjectDraftInput {
  draftId: string;
  creationTicket: string;
  document: ProjectPublication;
  now: string;
}

export async function createProjectDraft(
  db: D1Database,
  actor: ActorContext | null,
  input: CreateProjectDraftInput,
): Promise<void> {
  requireScope(actor, "draft:create");
  const validation = validateProject(input.document);
  if (!validation.ok) {
    throw new WorkflowError(validation.errors.join("; "), 422);
  }
  const primary =
    input.document.repository_sources.find((source) => source.role === "primary") ??
    input.document.repository_sources[0];
  if (!primary) {
    throw new WorkflowError("repository source required", 422);
  }
  const ticket = await db
    .prepare(
      `SELECT ticket_id FROM creation_tickets
       WHERE ticket_id = ?
         AND issued_to_actor_id = ?
         AND platform = ?
         AND platform_repository_id = ?
         AND consumed_at IS NULL
         AND expires_at > ?`,
    )
    .bind(
      input.creationTicket,
      actor.actorId,
      primary.platform,
      primary.platform_repository_id,
      input.now,
    )
    .first<{ ticket_id: string }>();
  if (!ticket) {
    throw new WorkflowError("valid creation ticket required", 403);
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO drafts (
          draft_id, project_id, status, base_revision, document_json,
          created_by_actor_id, updated_by_actor_id, created_at, updated_at
        ) VALUES (?, NULL, 'draft', 0, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.draftId,
        JSON.stringify(input.document),
        actor.actorId,
        actor.actorId,
        input.now,
        input.now,
      ),
    db
      .prepare("UPDATE creation_tickets SET consumed_at = ? WHERE ticket_id = ?")
      .bind(input.now, input.creationTicket),
  ]);
}

export interface SubmitDraftInput {
  submissionId: string;
  baseRevision: number;
  riskLevel: "low" | "high";
  now: string;
}

export async function submitProjectDraft(
  db: D1Database,
  actor: ActorContext | null,
  draftId: string,
  input: SubmitDraftInput,
): Promise<void> {
  requireScope(actor, "draft:update");
  const draft = await workflow.getDraft(db, draftId);
  if (!draft) {
    throw new WorkflowError("draft not found", 404);
  }
  if (draft.status !== "draft" && draft.status !== "changes_requested") {
    throw new WorkflowError("draft cannot be submitted from its current state", 409);
  }
  if (draft.baseRevision !== input.baseRevision) {
    throw new WorkflowError("draft base revision is stale", 409);
  }
  if (draft.projectId) {
    const project = await db
      .prepare("SELECT current_revision_number FROM projects WHERE project_id = ?")
      .bind(draft.projectId)
      .first<{ current_revision_number: number | null }>();
    if ((project?.current_revision_number ?? 0) !== input.baseRevision) {
      throw new WorkflowError("published base revision has advanced", 409);
    }
  }
  const validation = validateProject(draft.document);
  if (!validation.ok) {
    throw new WorkflowError(validation.errors.join("; "), 422);
  }
  await db.batch([
    db
      .prepare(
        `INSERT INTO submissions (
          submission_id, draft_id, submitted_by_actor_id, risk_level, submitted_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        input.submissionId,
        draftId,
        actor.actorId,
        input.riskLevel,
        input.now,
      ),
    db
      .prepare(
        `UPDATE drafts SET status = 'in_review', updated_by_actor_id = ?, updated_at = ?
         WHERE draft_id = ?`,
      )
      .bind(actor.actorId, input.now, draftId),
  ]);
}

export interface ApproveSubmissionInput {
  reviewId: string;
  now: string;
  notes?: string;
}

export async function approveSubmission(
  db: D1Database,
  actor: ActorContext | null,
  submissionId: string,
  input: ApproveSubmissionInput,
): Promise<void> {
  requireScope(actor, "review:approve");
  const submission = await db
    .prepare(
      `SELECT s.draft_id, s.risk_level, d.status, d.created_by_actor_id
       FROM submissions s
       JOIN drafts d ON d.draft_id = s.draft_id
       WHERE s.submission_id = ?`,
    )
    .bind(submissionId)
    .first<{
      draft_id: string;
      risk_level: "low" | "high";
      status: string;
      created_by_actor_id: string;
    }>();
  if (!submission) {
    throw new WorkflowError("submission not found", 404);
  }
  if (submission.status !== "in_review") {
    throw new WorkflowError("submission is not in review", 409);
  }
  if (
    submission.risk_level === "high" &&
    submission.created_by_actor_id === actor.actorId
  ) {
    throw new WorkflowError("high-risk content requires an independent reviewer", 403);
  }
  await db.batch([
    db
      .prepare(
        `INSERT INTO reviews (
          review_id, submission_id, reviewer_actor_id, decision, notes, created_at
        ) VALUES (?, ?, ?, 'approved', ?, ?)`,
      )
      .bind(
        input.reviewId,
        submissionId,
        actor.actorId,
        input.notes ?? "",
        input.now,
      ),
    db
      .prepare(
        `UPDATE drafts SET status = 'approved', updated_by_actor_id = ?, updated_at = ?
         WHERE draft_id = ?`,
      )
      .bind(actor.actorId, input.now, submission.draft_id),
  ]);
}

export interface PublishDraftInput {
  auditEventId: string;
  now: string;
  reason: string;
}

export async function publishApprovedDraft(
  db: D1Database,
  actor: ActorContext | null,
  draftId: string,
  input: PublishDraftInput,
): Promise<projects.InsertRevisionResult> {
  requireScope(actor, "publish");
  const draft = await workflow.getDraft(db, draftId);
  if (!draft) {
    throw new WorkflowError("draft not found", 404);
  }
  if (draft.status !== "approved") {
    throw new WorkflowError("only an approved draft can be published", 409);
  }
  const currentProject = await db
    .prepare("SELECT current_revision_number FROM projects WHERE project_id = ?")
    .bind(draft.document.project_id)
    .first<{ current_revision_number: number | null }>();
  const currentRevision = currentProject?.current_revision_number ?? 0;
  if (currentRevision !== draft.baseRevision) {
    throw new WorkflowError("published base revision has advanced", 409);
  }

  const document = structuredClone(draft.document);
  const nextRevision = currentRevision + 1;
  document.record_state = "published";
  document.publication = {
    ...document.publication,
    base_revision: currentRevision,
    revision: nextRevision,
    status: "published",
    review_decision: "approved",
    published_at: input.now,
  };
  const validation = validateProject(document);
  if (!validation.ok) {
    throw new WorkflowError(validation.errors.join("; "), 422);
  }

  return projects.insertRevision(db, document, actor.actorId, [
    db
      .prepare(
        `UPDATE drafts SET
          project_id = ?, status = 'published', updated_by_actor_id = ?, updated_at = ?
         WHERE draft_id = ?`,
      )
      .bind(document.project_id, actor.actorId, input.now, draftId),
    db
      .prepare(
        `INSERT INTO audit_events (
          audit_event_id, actor_id, action, target_type, target_id,
          reason, diff_json, evidence_ids_json, created_at
        ) VALUES (?, ?, 'project.publish', 'project', ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.auditEventId,
        actor.actorId,
        document.project_id,
        input.reason,
        JSON.stringify({
          base_revision: currentRevision,
          published_revision: nextRevision,
        }),
        JSON.stringify(document.evidence.map((item) => item.evidence_id)),
        input.now,
      ),
  ]);
}
