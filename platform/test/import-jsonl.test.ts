import { describe, expect, it } from "vitest";
import type { ProjectPublication } from "../src/domain/project";
import {
  chunkRecords,
  parseAndValidateJsonl,
  selectUniqueRepositories,
} from "../src/services/import";

function record(projectId: string, repositoryId: string): ProjectPublication {
  return {
    project_id: projectId,
    repository_sources: [
      { platform: "github", platform_repository_id: repositoryId },
    ],
  } as ProjectPublication;
}

describe("JSONL import preparation", () => {
  it("rejects an invalid record before database writes", () => {
    expect(() =>
      parseAndValidateJsonl('{"schema_version":"wrong"}\n'),
    ).toThrow("line 1 is invalid");
  });

  it("reports duplicate stable repository identities", () => {
    const result = selectUniqueRepositories([
      record("project-one", "same-repository"),
      record("project-two", "same-repository"),
      record("project-three", "different-repository"),
    ]);

    expect(result.records.map((item) => item.project_id)).toEqual([
      "project-one",
      "project-three",
    ]);
    expect(result.duplicates).toEqual([
      {
        platform: "github",
        platformRepositoryId: "same-repository",
        keptProjectId: "project-one",
        skippedProjectId: "project-two",
      },
    ]);
  });

  it("splits writes into batches of at most 100 records", () => {
    expect(chunkRecords(Array.from({ length: 205 }, (_, index) => index))).toEqual([
      Array.from({ length: 100 }, (_, index) => index),
      Array.from({ length: 100 }, (_, index) => index + 100),
      Array.from({ length: 5 }, (_, index) => index + 200),
    ]);
  });
});
