import { describe, expect, it } from "vitest";
import { SECTION_KEYS, type ProjectPublication } from "../src/domain/project";
import { validateProject } from "../src/domain/validate";

const observedAt = "2026-08-02T00:00:00Z";

function completeProject(): ProjectPublication {
  const section = {
    state: "verified" as const,
    summary: "来自项目 README 的简短结论。",
    body: "正文保留可核验事实和编辑判断的边界。",
    key_points: ["可核验要点"],
    evidence_ids: ["repo-readme"],
    confidence: "high" as const,
    updated_at: observedAt,
  };

  return {
    schema_version: "project-publication-v1",
    project_id: "project-aider",
    record_state: "draft",
    repository_sources: [
      {
        platform: "github",
        platform_repository_id: "654321",
        canonical_url: "https://github.com/Aider-AI/aider",
        full_name: "Aider-AI/aider",
        role: "primary",
        visibility: "public",
        default_branch: "main",
        observed_oid: "abc123",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: observedAt,
        pushed_at: observedAt,
        observed_at: observedAt,
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
      aliases: ["aider-chat"],
      former_names: [],
      objective_definition: "在终端中协助修改代码的开源 AI 编程工具。",
      website_url: "https://aider.chat/",
      documentation_url: "https://aider.chat/docs/",
      demo_url: null,
      download_url: null,
      first_published_at: "2023-01-01T00:00:00Z",
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
        creator_id: "org-aider-ai",
        role: "organization",
        evidence_ids: ["repo-readme"],
      },
    ],
    discovery: {
      domains: ["devtools"],
      subcategories: ["ai-coding"],
      tasks: ["edit-code"],
      capabilities: ["repository-editing"],
      project_types: ["cli"],
      languages: ["Python"],
      frameworks: [],
      runtimes: ["Python"],
      protocols: [],
      delivery_methods: ["source"],
      package_formats: ["PyPI"],
      operating_systems: ["Linux", "macOS", "Windows"],
      runtime_targets: ["terminal"],
      hardware_requirements: [],
      natural_languages: ["English"],
      open_source_nature: "open_source",
      licenses: ["Apache-2.0"],
      maturity: "established",
      maintenance_status: "active",
      latest_activity_at: observedAt,
      search_aliases: ["AI coding assistant"],
      canonical_keywords: ["coding", "agent"],
    },
    card: {
      name: "Aider",
      chinese_name: "Aider AI 编程助手",
      summary: "在终端中协助修改代码的开源 AI 编程工具。",
      use_when: "需要在现有 Git 仓库中由 AI 协助编辑代码。",
      avoid_when: "不能向模型提供代码或需要纯图形界面时。",
      primary_category: "AI 编程工具",
      primary_language: "Python",
      license: "Apache-2.0",
      maintenance_status: "active",
      primary_creator: "Aider AI",
      verification_status: "verified",
      verified_at: observedAt,
    },
    sections: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, { ...section }]),
    ) as ProjectPublication["sections"],
    evidence: [
      {
        evidence_id: "repo-readme",
        url: "https://github.com/Aider-AI/aider/blob/abc123/README.md",
        source_type: "repository_readme",
        retrieved_at: observedAt,
        supports: ["card.summary", "sections.overview"],
        fact_summary: "项目 README 对工具定位和使用方式的说明。",
        applicable_version: "abc123",
        content_hash: null,
      },
    ],
    field_states: {
      "identity.objective_definition": "verified",
      "card.summary": "verified",
    },
    editorial: {
      researcher_actor_ids: ["agent-researcher"],
      editor_actor_ids: ["agent-editor"],
      reviewer_actor_ids: [],
      work_notes: "测试记录",
      internal_notes: "",
    },
    publication: {
      base_revision: 0,
      revision: 1,
      status: "draft",
      review_decision: null,
      published_at: null,
      withdrawn_reason: null,
      superseded_by_revision: null,
      migration_status: "native",
    },
  };
}

describe("project-publication-v1", () => {
  it("accepts a complete publication object", () => {
    expect(validateProject(completeProject()).ok).toBe(true);
  });

  it("rejects fields outside the fixed template", () => {
    expect(validateProject({ ...completeProject(), unexpected: true }).ok).toBe(
      false,
    );
  });

  it("rejects a missing fixed section", () => {
    const project = completeProject();
    delete (project.sections as Partial<ProjectPublication["sections"]>)
      .limitations_and_risks;

    expect(validateProject(project).ok).toBe(false);
  });

  it("accepts an explicitly unknown section", () => {
    const project = completeProject();
    project.sections.background_and_history.state = "unknown";
    project.sections.background_and_history.confidence = "low";

    expect(validateProject(project).ok).toBe(true);
  });

  it("rejects verified content without an existing evidence reference", () => {
    const project = completeProject();
    project.sections.overview.evidence_ids = [];

    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "sections.overview: verified content requires evidence",
    );
  });
});
