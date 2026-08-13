export const SECTION_KEYS = [
  "overview",
  "problem_and_positioning",
  "background_and_history",
  "creators_and_organization",
  "design_philosophy",
  "architecture_and_technology",
  "core_capabilities",
  "installation_and_usage",
  "limitations_and_risks",
  "maintenance_and_releases",
  "ecosystem_and_interoperability",
  "alternatives_and_selection",
  "community_and_channels",
  "editorial_assessment",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
export type FieldState =
  | "verified"
  | "inferred"
  | "unknown"
  | "conflicting"
  | "stale"
  | "not_applicable";
export type Confidence = "high" | "medium" | "low";
export type WorkflowStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "stale"
  | "archived";

export interface PublicationSection {
  state: FieldState;
  summary: string;
  body: string;
  key_points: string[];
  evidence_ids: string[];
  confidence: Confidence;
  updated_at: string;
}

export interface RepositorySource {
  platform: "github" | "gitlab" | "gitee" | "codeberg";
  platform_repository_id: string;
  canonical_url: string;
  full_name: string;
  role: "primary" | "component" | "mirror" | "archive";
  visibility: "public" | "private" | "unknown";
  default_branch: string | null;
  observed_oid: string | null;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  observed_at: string;
  is_fork: boolean;
  mirror_url: string | null;
  archived: boolean;
  disabled: boolean;
  evidence_ids: string[];
}

export interface Evidence {
  evidence_id: string;
  url: string;
  source_type: string;
  retrieved_at: string;
  supports: string[];
  fact_summary: string;
  applicable_version: string | null;
  content_hash: string | null;
}

export interface ProjectPublication {
  schema_version: "project-publication-v1";
  project_id: string;
  record_state: WorkflowStatus;
  repository_sources: RepositorySource[];
  identity: {
    name: string;
    chinese_name: string | null;
    aliases: string[];
    former_names: string[];
    objective_definition: string;
    website_url: string | null;
    documentation_url: string | null;
    demo_url: string | null;
    download_url: string | null;
    first_published_at: string | null;
    lifecycle: string;
    visual: {
      url: string | null;
      kind: "logo" | "screenshot" | "cover" | "none";
      source_url: string | null;
      usage_basis: string;
    };
  };
  attribution: Array<{
    creator_id: string;
    role:
      | "creator"
      | "current_owner"
      | "maintainer"
      | "organization"
      | "foundation"
      | "sponsor_of_upstream";
    evidence_ids: string[];
  }>;
  discovery: {
    domains: string[];
    subcategories: string[];
    tasks: string[];
    capabilities: string[];
    project_types: string[];
    languages: string[];
    frameworks: string[];
    runtimes: string[];
    protocols: string[];
    delivery_methods: string[];
    package_formats: string[];
    operating_systems: string[];
    runtime_targets: string[];
    hardware_requirements: string[];
    natural_languages: string[];
    open_source_nature: string;
    licenses: string[];
    maturity: string;
    maintenance_status: string;
    latest_activity_at: string | null;
    search_aliases: string[];
    canonical_keywords: string[];
  };
  card: {
    name: string;
    chinese_name: string | null;
    summary: string;
    use_when: string;
    avoid_when: string;
    primary_category: string;
    primary_language: string | null;
    license: string | null;
    maintenance_status: string;
    primary_creator: string | null;
    verification_status: FieldState;
    verified_at: string | null;
  };
  sections: { [K in SectionKey]: PublicationSection };
  evidence: Evidence[];
  field_states: Record<string, FieldState>;
  editorial: {
    researcher_actor_ids: string[];
    editor_actor_ids: string[];
    reviewer_actor_ids: string[];
    work_notes: string;
    internal_notes: string;
  };
  publication: {
    base_revision: number;
    revision: number;
    status: WorkflowStatus;
    review_decision: string | null;
    published_at: string | null;
    withdrawn_reason: string | null;
    superseded_by_revision: number | null;
    migration_status: "native" | "legacy_imported";
  };
}
