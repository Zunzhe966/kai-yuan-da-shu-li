import { SECTION_KEYS, type ProjectPublication } from "../domain/project";
import type { GithubRepositoryMetadata } from "./repositories";

export interface NativeProjectDraftInput {
  projectId: string;
  name: string;
  chineseName: string | null;
  summary: string;
  useWhen: string;
  avoidWhen: string;
  primaryCategory: string;
  domain: string | null;
  actorId: string;
  repository: GithubRepositoryMetadata;
  now: string;
}

const UNKNOWN_SECTION_SUMMARY = "尚未完成该栏目研究，等待智能体补充证据与正文。";

export function buildNativeProjectDraft(
  input: NativeProjectDraftInput,
): ProjectPublication {
  const evidenceId = `github-repository-${input.repository.platformRepositoryId}`;
  const unknownSection = () => ({
    state: "unknown" as const,
    summary: UNKNOWN_SECTION_SUMMARY,
    body: "",
    key_points: [],
    evidence_ids: [],
    confidence: "low" as const,
    updated_at: input.now,
  });
  const inferredSection = (summary: string) => ({
    state: "inferred" as const,
    summary,
    body: "",
    key_points: [],
    evidence_ids: [],
    confidence: "low" as const,
    updated_at: input.now,
  });
  const sections = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, unknownSection()]),
  ) as unknown as ProjectPublication["sections"];
  sections.overview = inferredSection(input.summary);
  sections.problem_and_positioning = inferredSection(`适用：${input.useWhen}`);
  sections.core_capabilities = inferredSection(input.summary);
  sections.limitations_and_risks = inferredSection(input.avoidWhen);
  const maintenanceStatus = input.repository.archived ? "archived" : "unknown";

  return {
    schema_version: "project-publication-v1",
    project_id: input.projectId,
    record_state: "draft",
    repository_sources: [
      {
        platform: "github",
        platform_repository_id: input.repository.platformRepositoryId,
        canonical_url: input.repository.canonicalUrl,
        full_name: input.repository.fullName,
        role: "primary",
        visibility: "public",
        default_branch: input.repository.defaultBranch,
        observed_oid: null,
        created_at: input.repository.createdAt,
        updated_at: input.repository.updatedAt,
        pushed_at: input.repository.pushedAt,
        observed_at: input.now,
        is_fork: input.repository.isFork,
        mirror_url: input.repository.mirrorUrl,
        archived: input.repository.archived,
        disabled: input.repository.disabled,
        evidence_ids: [evidenceId],
      },
    ],
    identity: {
      name: input.name,
      chinese_name: input.chineseName,
      aliases: [],
      former_names: [],
      objective_definition: input.summary,
      website_url: null,
      documentation_url: null,
      demo_url: null,
      download_url: null,
      first_published_at: input.repository.createdAt,
      lifecycle: maintenanceStatus,
      visual: {
        url: null,
        kind: "none",
        source_url: null,
        usage_basis: "not_provided",
      },
    },
    attribution: [],
    discovery: {
      domains: input.domain ? [input.domain] : [],
      subcategories: [],
      tasks: [input.useWhen],
      capabilities: [],
      project_types: [],
      languages: input.repository.primaryLanguage
        ? [input.repository.primaryLanguage]
        : [],
      frameworks: [],
      runtimes: [],
      protocols: [],
      delivery_methods: ["source"],
      package_formats: [],
      operating_systems: [],
      runtime_targets: [],
      hardware_requirements: [],
      natural_languages: [],
      open_source_nature: "open_source",
      licenses: input.repository.license ? [input.repository.license] : [],
      maturity: "unknown",
      maintenance_status: maintenanceStatus,
      latest_activity_at: input.repository.pushedAt,
      search_aliases: [],
      canonical_keywords: [],
    },
    card: {
      name: input.name,
      chinese_name: input.chineseName,
      summary: input.summary,
      use_when: input.useWhen,
      avoid_when: input.avoidWhen,
      primary_category: input.primaryCategory,
      primary_language: input.repository.primaryLanguage,
      license: input.repository.license,
      maintenance_status: maintenanceStatus,
      primary_creator: null,
      verification_status: "inferred",
      verified_at: null,
    },
    sections,
    evidence: [
      {
        evidence_id: evidenceId,
        url: `https://api.github.com/repositories/${input.repository.platformRepositoryId}`,
        source_type: "github_repository_api",
        retrieved_at: input.now,
        supports: ["repository_sources", "discovery.languages", "discovery.licenses"],
        fact_summary: "GitHub public repository metadata used to establish stable identity.",
        applicable_version: null,
        content_hash: null,
      },
    ],
    field_states: {
      repository_sources: "verified",
      "identity.objective_definition": "inferred",
      card: "inferred",
      discovery: "inferred",
    },
    editorial: {
      researcher_actor_ids: [input.actorId],
      editor_actor_ids: [input.actorId],
      reviewer_actor_ids: [],
      work_notes: "由 Studio 固定模板建立，等待逐栏目研究和独立审核。",
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
