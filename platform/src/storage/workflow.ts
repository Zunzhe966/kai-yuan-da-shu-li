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
