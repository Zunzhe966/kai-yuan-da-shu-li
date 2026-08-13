import type { ProjectPublication, WorkflowStatus } from "../domain/project";

export interface CreateDraftInput {
  draftId: string;
  projectId: string | null;
  baseRevision: number;
  document: ProjectPublication;
  actorId: string;
  createdAt: string;
}

export interface StoredDraft {
  draftId: string;
  projectId: string | null;
  status: WorkflowStatus;
  baseRevision: number;
  document: ProjectPublication;
  createdByActorId: string;
  updatedByActorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSubmission {
  submissionId: string;
  draftId: string;
  submittedByActorId: string;
  riskLevel: "low" | "high";
  submittedAt: string;
}

export async function listDrafts(
  db: D1Database,
  limit = 100,
): Promise<StoredDraft[]> {
  const result = await db
    .prepare(
      `SELECT draft_id, project_id, status, base_revision, document_json,
              created_by_actor_id, updated_by_actor_id, created_at, updated_at
       FROM drafts
       ORDER BY updated_at DESC, draft_id
       LIMIT ?`,
    )
    .bind(Math.min(Math.max(limit, 1), 200))
    .all<DraftRow>();
  return result.results.map(toStoredDraft);
}

interface DraftRow {
  draft_id: string;
  project_id: string | null;
  status: WorkflowStatus;
  base_revision: number;
  document_json: string;
  created_by_actor_id: string;
  updated_by_actor_id: string;
  created_at: string;
  updated_at: string;
}

function toStoredDraft(row: DraftRow): StoredDraft {
  return {
    draftId: row.draft_id,
    projectId: row.project_id,
    status: row.status,
    baseRevision: row.base_revision,
    document: JSON.parse(row.document_json) as ProjectPublication,
    createdByActorId: row.created_by_actor_id,
    updatedByActorId: row.updated_by_actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDraft(
  db: D1Database,
  input: CreateDraftInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO drafts (
        draft_id, project_id, status, base_revision, document_json,
        created_by_actor_id, updated_by_actor_id, created_at, updated_at
      ) VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.draftId,
      input.projectId,
      input.baseRevision,
      JSON.stringify(input.document),
      input.actorId,
      input.actorId,
      input.createdAt,
      input.createdAt,
    )
    .run();
}

export async function getDraft(
  db: D1Database,
  draftId: string,
): Promise<StoredDraft | null> {
  const row = await db
    .prepare(
      `SELECT draft_id, project_id, status, base_revision, document_json,
              created_by_actor_id, updated_by_actor_id, created_at, updated_at
       FROM drafts WHERE draft_id = ?`,
    )
    .bind(draftId)
    .first<DraftRow>();
  if (!row) {
    return null;
  }
  return toStoredDraft(row);
}

export async function updateDraftDocument(
  db: D1Database,
  draftId: string,
  baseRevision: number,
  document: ProjectPublication,
  actorId: string,
  updatedAt: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE drafts SET document_json = ?, updated_by_actor_id = ?, updated_at = ?
       WHERE draft_id = ?
         AND base_revision = ?
         AND status IN ('draft', 'changes_requested')`,
    )
    .bind(
      JSON.stringify(document),
      actorId,
      updatedAt,
      draftId,
      baseRevision,
    )
    .run();
  return (result.meta.changes ?? 0) === 1;
}

export async function getLatestSubmissionForDraft(
  db: D1Database,
  draftId: string,
): Promise<StoredSubmission | null> {
  const row = await db
    .prepare(
      `SELECT submission_id, draft_id, submitted_by_actor_id, risk_level, submitted_at
       FROM submissions
       WHERE draft_id = ?
       ORDER BY submitted_at DESC, submission_id DESC
       LIMIT 1`,
    )
    .bind(draftId)
    .first<{
      submission_id: string;
      draft_id: string;
      submitted_by_actor_id: string;
      risk_level: "low" | "high";
      submitted_at: string;
    }>();
  return row
    ? {
        submissionId: row.submission_id,
        draftId: row.draft_id,
        submittedByActorId: row.submitted_by_actor_id,
        riskLevel: row.risk_level,
        submittedAt: row.submitted_at,
      }
    : null;
}
