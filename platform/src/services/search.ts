import type { ProjectPublication } from "../domain/project";

export interface SearchInput {
  query?: string;
  entityType?: "all" | "project" | "creator";
  domain?: string[];
  capability?: string[];
  language?: string[];
  license?: string[];
  status?: string[];
  projectType?: string[];
  delivery?: string[];
  platform?: string[];
  updatedFrom?: string;
  updatedTo?: string;
  unknownPolicy?: "include" | "exclude";
  sort?: "relevance" | "updated" | "name";
  cursor?: string;
  limit?: number;
}

export interface ProjectSearchResult {
  total: number;
  items: ProjectPublication[];
  nextCursor: string | null;
}

export type { CreatorProfile } from "../storage/creators";

interface DocumentRow {
  project_id: string;
  document_json: string;
}

function ftsQuery(value: string): string {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(" AND ");
}

function addFacet(
  clauses: string[],
  values: unknown[],
  facetType: string,
  selected: string[] | undefined,
): void {
  if (!selected?.length) {
    return;
  }
  clauses.push(
    `EXISTS (
      SELECT 1 FROM project_search_facets f
      WHERE f.project_id = p.project_id
        AND f.facet_type = ?
        AND f.facet_value IN (${selected.map(() => "?").join(", ")})
    )`,
  );
  values.push(facetType, ...selected);
}

function buildWhere(input: SearchInput): { sql: string; values: unknown[] } {
  const clauses = ["p.current_revision_id IS NOT NULL"];
  const values: unknown[] = [];
  const query = input.query?.trim();
  if (query) {
    clauses.push(
      "p.project_id IN (SELECT project_id FROM projects_fts WHERE projects_fts MATCH ?)",
    );
    values.push(ftsQuery(query));
  }
  addFacet(clauses, values, "domain", input.domain);
  addFacet(clauses, values, "capability", input.capability);
  addFacet(clauses, values, "language", input.language);
  addFacet(clauses, values, "license", input.license);
  addFacet(clauses, values, "project_type", input.projectType);
  addFacet(clauses, values, "delivery_method", input.delivery);
  if (input.status?.length) {
    clauses.push(`p.status IN (${input.status.map(() => "?").join(", ")})`);
    values.push(...input.status);
  }
  if (input.platform?.length) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM repository_sources rs
        WHERE rs.project_id = p.project_id
          AND rs.platform IN (${input.platform.map(() => "?").join(", ")})
      )`,
    );
    values.push(...input.platform);
  }
  if (input.updatedFrom) {
    clauses.push("p.updated_at >= ?");
    values.push(input.updatedFrom);
  }
  if (input.updatedTo) {
    clauses.push("p.updated_at <= ?");
    values.push(input.updatedTo);
  }
  if (input.cursor) {
    clauses.push("p.project_id > ?");
    values.push(input.cursor);
  }
  return { sql: clauses.join(" AND "), values };
}

export async function searchProjects(
  db: D1Database,
  input: SearchInput,
): Promise<ProjectSearchResult> {
  const where = buildWhere(input);
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 50);
  const orderBy =
    input.sort === "updated"
      ? "p.updated_at DESC, p.project_id"
      : "p.name COLLATE NOCASE, p.project_id";
  const count = await db
    .prepare(`SELECT COUNT(*) AS total FROM projects p WHERE ${where.sql}`)
    .bind(...where.values)
    .first<{ total: number }>();
  const result = await db
    .prepare(
      `SELECT p.project_id, r.document_json
       FROM projects p
       JOIN project_revisions r ON r.revision_id = p.current_revision_id
       WHERE ${where.sql}
       ORDER BY ${orderBy}
       LIMIT ?`,
    )
    .bind(...where.values, limit + 1)
    .all<DocumentRow>();
  const hasMore = result.results.length > limit;
  const visible = result.results.slice(0, limit);
  return {
    total: count?.total ?? 0,
    items: visible.map(
      (row) => JSON.parse(row.document_json) as ProjectPublication,
    ),
    nextCursor: hasMore ? (visible.at(-1)?.project_id ?? null) : null,
  };
}

export function searchInputFromUrl(url: URL): SearchInput {
  const split = (name: string): string[] | undefined => {
    const values = url.searchParams
      .getAll(name)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    return values.length ? values : undefined;
  };
  const sort = url.searchParams.get("sort");
  const unknownPolicy = url.searchParams.get("unknown");
  const entityType = url.searchParams.get("entity");
  return {
    query: url.searchParams.get("q") ?? undefined,
    entityType:
      entityType === "project" || entityType === "creator" ? entityType : "all",
    domain: split("domain"),
    capability: split("capability"),
    language: split("language"),
    license: split("license"),
    status: split("status"),
    projectType: split("project_type"),
    delivery: split("delivery"),
    platform: split("platform"),
    updatedFrom: url.searchParams.get("updated_from") ?? undefined,
    updatedTo: url.searchParams.get("updated_to") ?? undefined,
    unknownPolicy: unknownPolicy === "exclude" ? "exclude" : "include",
    sort:
      sort === "updated" || sort === "name" || sort === "relevance"
        ? sort
        : "relevance",
    cursor: url.searchParams.get("cursor") ?? undefined,
  };
}
