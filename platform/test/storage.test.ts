import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { SECTION_KEYS, type ProjectPublication } from "../src/domain/project";
import * as creators from "../src/storage/creators";
import * as projects from "../src/storage/projects";
import * as workflow from "../src/storage/workflow";

interface StorageTestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as StorageTestEnv;
const now = "2026-08-02T00:00:00Z";

function fixture(options: {
  projectId?: string;
  repositoryId?: string;
  revision: number;
}): ProjectPublication {
  const projectId = options.projectId ?? "project-aider";
  const section = {
    state: "verified" as const,
    summary: "已核验内容",
    body: "正文",
    key_points: [],
    evidence_ids: ["repo-readme"],
    confidence: "high" as const,
    updated_at: now,
  };

  return {
    schema_version: "project-publication-v1",
    project_id: projectId,
    record_state: "published",
    repository_sources: [
      {
        platform: "github",
        platform_repository_id: options.repositoryId ?? "654321",
        canonical_url: "https://github.com/Aider-AI/aider",
        full_name: "Aider-AI/aider",
        role: "primary",
        visibility: "public",
        default_branch: "main",
        observed_oid: `oid-${options.revision}`,
        created_at: now,
        updated_at: now,
        pushed_at: now,
        observed_at: now,
        is_fork: false,
        mirror_url: null,
        archived: false,
        disabled: false,
        evidence_ids: ["repo-readme"],
      },
    ],
    identity: {
      name: "Aider",
      chinese_name: "Aider AI 编程助手",
      aliases: [],
      former_names: [],
      objective_definition: "AI 编程工具",
      website_url: null,
      documentation_url: null,
      demo_url: null,
      download_url: null,
      first_published_at: now,
      lifecycle: "active",
      visual: {
        url: null,
        kind: "none",
        source_url: null,
        usage_basis: "not_provided",
      },
    },
    attribution: [
      {
        creator_id: "creator-aider",
        role: "creator",
        evidence_ids: ["repo-readme"],
      },
      {
        creator_id: "org-aider",
        role: "organization",
        evidence_ids: ["repo-readme"],
      },
    ],
    discovery: {
      domains: ["devtools"],
      subcategories: [],
      tasks: ["edit-code"],
      capabilities: ["coding"],
      project_types: ["cli"],
      languages: ["Python"],
      frameworks: [],
      runtimes: ["Python"],
      protocols: [],
      delivery_methods: ["source"],
      package_formats: ["PyPI"],
      operating_systems: [],
      runtime_targets: ["terminal"],
      hardware_requirements: [],
      natural_languages: ["English"],
      open_source_nature: "open_source",
      licenses: ["Apache-2.0"],
      maturity: "established",
      maintenance_status: "active",
      latest_activity_at: now,
      search_aliases: [],
      canonical_keywords: ["coding"],
    },
    card: {
      name: "Aider",
      chinese_name: "Aider AI 编程助手",
      summary: `第 ${options.revision} 版摘要`,
      use_when: "需要修改代码",
      avoid_when: "不能共享代码",
      primary_category: "AI 编程",
      primary_language: "Python",
      license: "Apache-2.0",
      maintenance_status: "active",
      primary_creator: "Aider",
      verification_status: "verified",
      verified_at: now,
    },
    sections: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, { ...section }]),
    ) as unknown as ProjectPublication["sections"],
    evidence: [
      {
        evidence_id: "repo-readme",
        url: "https://github.com/Aider-AI/aider/blob/main/README.md",
        source_type: "repository_readme",
        retrieved_at: now,
        supports: ["card.summary"],
        fact_summary: "README",
        applicable_version: null,
        content_hash: null,
      },
    ],
    field_states: { "card.summary": "verified" },
    editorial: {
      researcher_actor_ids: ["actor-test"],
      editor_actor_ids: ["actor-test"],
      reviewer_actor_ids: ["actor-reviewer"],
      work_notes: "",
      internal_notes: "",
    },
    publication: {
      base_revision: Math.max(0, options.revision - 1),
      revision: options.revision,
      status: "published",
      review_decision: "approved",
      published_at: now,
      withdrawn_reason: null,
      superseded_by_revision: null,
      migration_status: "native",
    },
  };
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
});

describe("project revision storage", () => {
  it("keeps immutable revisions and advances only the current pointer", async () => {
    const first = await projects.insertRevision(testEnv.DB, fixture({ revision: 1 }));
    await projects.insertRevision(testEnv.DB, fixture({ revision: 2 }));

    const history = await projects.listRevisions(testEnv.DB, first.projectId);
    expect(history.map((item) => item.revision)).toEqual([1, 2]);
    expect((await projects.getPublished(testEnv.DB, first.projectId))?.revision).toBe(
      2,
    );
    expect(JSON.parse(history[0]!.documentJson).card.summary).toBe("第 1 版摘要");
  });

  it("rejects a duplicate stable repository identity", async () => {
    await projects.insertRevision(
      testEnv.DB,
      fixture({ projectId: "project-one", repositoryId: "duplicate", revision: 1 }),
    );

    await expect(
      projects.insertRevision(
        testEnv.DB,
        fixture({ projectId: "project-two", repositoryId: "duplicate", revision: 1 }),
      ),
    ).rejects.toThrow();
  });

  it("preserves explicit creator roles", async () => {
    await creators.upsertCreator(testEnv.DB, {
      creatorId: "creator-aider",
      type: "person",
      name: "Paul Gauthier",
    });
    await creators.upsertCreator(testEnv.DB, {
      creatorId: "org-aider",
      type: "organization",
      name: "Aider AI",
    });
    await projects.insertRevision(
      testEnv.DB,
      fixture({ projectId: "project-roles", repositoryId: "roles", revision: 1 }),
    );
    await creators.replaceProjectRoles(
      testEnv.DB,
      "project-roles",
      fixture({ projectId: "project-roles", repositoryId: "roles", revision: 1 })
        .attribution,
    );

    expect(await creators.listProjectRoles(testEnv.DB, "project-roles")).toEqual([
      { creatorId: "creator-aider", role: "creator" },
      { creatorId: "org-aider", role: "organization" },
    ]);
  });
});

describe("editorial workflow storage", () => {
  it("persists a draft with its base revision and actor", async () => {
    await testEnv.DB.prepare(
      `INSERT INTO actors (actor_id, actor_type, display_name)
       VALUES ('actor-draft', 'agent', 'Draft Agent')`,
    ).run();
    const document = fixture({
      projectId: "project-draft",
      repositoryId: "draft-repository",
      revision: 1,
    });

    await workflow.createDraft(testEnv.DB, {
      draftId: "draft-one",
      projectId: null,
      baseRevision: 0,
      document,
      actorId: "actor-draft",
      createdAt: now,
    });

    const draft = await workflow.getDraft(testEnv.DB, "draft-one");
    expect(draft).toMatchObject({
      draftId: "draft-one",
      projectId: null,
      status: "draft",
      baseRevision: 0,
      createdByActorId: "actor-draft",
      updatedByActorId: "actor-draft",
    });
    expect(draft?.document.card.name).toBe("Aider");
  });
});
