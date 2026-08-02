import type { ProjectPublication } from "../domain/project";
import { validateProject } from "../domain/validate";

export interface DuplicateRepository {
  platform: string;
  platformRepositoryId: string;
  keptProjectId: string;
  skippedProjectId: string;
}

export interface UniqueRepositorySelection {
  records: ProjectPublication[];
  duplicates: DuplicateRepository[];
}

export function parseAndValidateJsonl(input: string): ProjectPublication[] {
  const records: ProjectPublication[] = [];
  for (const [index, rawLine] of input.split("\n").entries()) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `line ${index + 1} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const validation = validateProject(value);
    if (!validation.ok) {
      throw new Error(
        `line ${index + 1} is invalid: ${validation.errors.join("; ")}`,
      );
    }
    records.push(value as ProjectPublication);
  }
  return records;
}

export function selectUniqueRepositories(
  input: ProjectPublication[],
): UniqueRepositorySelection {
  const seen = new Map<string, string>();
  const records: ProjectPublication[] = [];
  const duplicates: DuplicateRepository[] = [];

  for (const record of input) {
    const source =
      record.repository_sources.find((item) => item.role === "primary") ??
      record.repository_sources[0];
    if (!source) {
      throw new Error(`project ${record.project_id} has no repository source`);
    }
    const key = `${source.platform}:${source.platform_repository_id}`;
    const keptProjectId = seen.get(key);
    if (keptProjectId) {
      duplicates.push({
        platform: source.platform,
        platformRepositoryId: source.platform_repository_id,
        keptProjectId,
        skippedProjectId: record.project_id,
      });
      continue;
    }
    seen.set(key, record.project_id);
    records.push(record);
  }

  return { records, duplicates };
}

export function chunkRecords<T>(records: T[], size = 100): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("batch size must be a positive integer");
  }
  const chunks: T[][] = [];
  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size));
  }
  return chunks;
}
