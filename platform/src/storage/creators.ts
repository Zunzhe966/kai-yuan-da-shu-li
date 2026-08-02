import type { ProjectPublication } from "../domain/project";

export interface CreatorInput {
  creatorId: string;
  type: "person" | "organization";
  name: string;
  displayName?: string;
  biography?: string;
}

export interface ProjectRole {
  creatorId: string;
  role: ProjectPublication["attribution"][number]["role"];
}

export async function upsertCreator(
  db: D1Database,
  creator: CreatorInput,
): Promise<void> {
  const timestamp = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO creators (
        creator_id, creator_type, name, display_name, biography, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(creator_id) DO UPDATE SET
        creator_type = excluded.creator_type,
        name = excluded.name,
        display_name = excluded.display_name,
        biography = excluded.biography,
        updated_at = excluded.updated_at`,
    )
    .bind(
      creator.creatorId,
      creator.type,
      creator.name,
      creator.displayName ?? creator.name,
      creator.biography ?? "",
      timestamp,
      timestamp,
    )
    .run();
}

export async function replaceProjectRoles(
  db: D1Database,
  projectId: string,
  attribution: ProjectPublication["attribution"],
): Promise<void> {
  const statements = [
    db
      .prepare("DELETE FROM creator_project_roles WHERE project_id = ?")
      .bind(projectId),
    ...attribution.map((item) =>
      db
        .prepare(
          `INSERT INTO creator_project_roles (
            creator_id, project_id, role, evidence_ids_json
          ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          item.creator_id,
          projectId,
          item.role,
          JSON.stringify(item.evidence_ids),
        ),
    ),
  ];
  await db.batch(statements);
}

export async function listProjectRoles(
  db: D1Database,
  projectId: string,
): Promise<ProjectRole[]> {
  const result = await db
    .prepare(
      `SELECT creator_id, role FROM creator_project_roles
       WHERE project_id = ? ORDER BY creator_id, role`,
    )
    .bind(projectId)
    .all<{ creator_id: string; role: ProjectRole["role"] }>();
  return result.results.map((row) => ({
    creatorId: row.creator_id,
    role: row.role,
  }));
}
