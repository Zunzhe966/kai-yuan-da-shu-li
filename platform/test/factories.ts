import { SECTION_KEYS, type ProjectPublication } from "../src/domain/project";

export const TEST_NOW = "2026-08-02T00:00:00Z";

export function projectFixture(options: {
  projectId?: string;
  repositoryId?: string;
  revision?: number;
  status?: ProjectPublication["publication"]["status"];
} = {}): ProjectPublication {
  const projectId = options.projectId ?? "project-aider";
  const revision = options.revision ?? 1;
  const status = options.status ?? "draft";
  const section = {
    state: "verified" as const,
    summary: "已核验内容",
    body: "正文",
    key_points: [],
    evidence_ids: ["repo-readme"],
    confidence: "high" as const,
    updated_at: TEST_NOW,
  };
  return {
    schema_version: "project-publication-v1",
    project_id: projectId,
    record_state: status,
    repository_sources: [
      {
        platform: "github",
        platform_repository_id: options.repositoryId ?? "654321",
        canonical_url: "https://github.com/Aider-AI/aider",
        full_name: "Aider-AI/aider",
        role: "primary",
        visibility: "public",
        default_branch: "main",
        observed_oid: `oid-${revision}`,
        created_at: TEST_NOW,
        updated_at: TEST_NOW,
        pushed_at: TEST_NOW,
        observed_at: TEST_NOW,
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
      first_published_at: TEST_NOW,
      lifecycle: "active",
      visual: {
        url: null,
        kind: "none",
        source_url: null,
        usage_basis: "not_provided",
      },
    },
    attribution: [],
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
      latest_activity_at: TEST_NOW,
      search_aliases: [],
      canonical_keywords: ["coding"],
    },
    card: {
      name: "Aider",
      chinese_name: "Aider AI 编程助手",
      summary: `第 ${revision} 版摘要`,
      use_when: "需要修改代码",
      avoid_when: "不能共享代码",
      primary_category: "AI 编程",
      primary_language: "Python",
      license: "Apache-2.0",
      maintenance_status: "active",
      primary_creator: null,
      verification_status: "verified",
      verified_at: TEST_NOW,
    },
    sections: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, { ...section }]),
    ) as unknown as ProjectPublication["sections"],
    evidence: [
      {
        evidence_id: "repo-readme",
        url: "https://github.com/Aider-AI/aider/blob/main/README.md",
        source_type: "repository_readme",
        retrieved_at: TEST_NOW,
        supports: ["card.summary"],
        fact_summary: "README",
        applicable_version: null,
        content_hash: null,
      },
    ],
    field_states: { "card.summary": "verified" },
    editorial: {
      researcher_actor_ids: ["actor-editor"],
      editor_actor_ids: ["actor-editor"],
      reviewer_actor_ids: [],
      work_notes: "",
      internal_notes: "",
    },
    publication: {
      base_revision: Math.max(0, revision - 1),
      revision,
      status,
      review_decision: status === "published" ? "approved" : null,
      published_at: status === "published" ? TEST_NOW : null,
      withdrawn_reason: null,
      superseded_by_revision: null,
      migration_status: "native",
    },
  };
}
