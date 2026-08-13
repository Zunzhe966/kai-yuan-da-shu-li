# Open-Source Discovery Platform Launch Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and launch a new Cloudflare-based open-source project search and editorial platform that replaces the old static catalog after migration and end-to-end verification.

**Architecture:** Build a side-by-side TypeScript Worker application under `platform/` so the dirty legacy tree stays untouched during development. D1 stores immutable project/creator revisions and workflow state; the Worker serves server-rendered public pages, REST, remote MCP, and the private Studio, while Python migration code converts existing YAML into the strict publication template.

**Tech Stack:** TypeScript, Cloudflare Workers, Hono, D1/SQLite, R2, Vitest Workers pool, Ajv JSON Schema, markdown-it, official Model Context Protocol TypeScript SDK, existing Python/PyYAML migration helpers, Playwright for browser verification.

---

## Delivery Split

This plan is the launchable core and includes the complete replacement path: strict schema, D1, migration, public search/detail/creator pages, Studio draft workflow, REST/MCP, change reports, backup export, and preview deployment. Real advertising, external author claims, non-GitHub ingestion adapters, and mass enrichment are separate post-launch plans.

Implementation happens in an isolated worktree created from the commit containing this plan. The current worktree remains the migration input and is never reset, cleaned, or bulk-copied.

## File Map

```text
platform/
  package.json                         dependency and command boundary
  tsconfig.json                        Worker TypeScript settings
  vitest.config.ts                     Workers-pool test environment
  wrangler.jsonc                       local bindings and assets
  migrations/0001_initial.sql          D1 schema and indexes
  public/assets/app.css                public and Studio styles
  public/assets/catalog.js             public filter interaction
  public/assets/studio.js              internal editor interaction
  src/index.ts                         Worker fetch/scheduled entry point
  src/app.ts                           Hono route composition
  src/env.ts                           binding types
  src/domain/project.ts                publication record types/constants
  src/domain/validate.ts               Ajv schema validation
  src/domain/scopes.ts                 actor permissions
  src/storage/projects.ts              projects/revisions queries
  src/storage/creators.ts              creator queries
  src/storage/workflow.ts              drafts/reviews/change reports
  src/services/publish.ts              immutable publish transaction
  src/services/search.ts               query and facets
  src/services/backup.ts               snapshot export
  src/http/public.ts                   human routes
  src/http/api.ts                      REST routes
  src/http/studio.ts                   private Studio routes
  src/http/mcp.ts                      remote MCP tools
  src/ui/layout.ts                     shared HTML shell
  src/ui/public-pages.ts               catalog/project/creator renderers
  src/ui/studio-pages.ts               internal editor renderers
  test/*.test.ts                       focused Worker/D1 tests
schema/project-publication-v1.schema.json
scripts/migrate_legacy_publications.py
tests/test_migrate_legacy_publications.py
```

### Task 1: Isolate Work and Scaffold the Worker

**Files:**
- Create: `platform/package.json`
- Create: `platform/tsconfig.json`
- Create: `platform/vitest.config.ts`
- Create: `platform/wrangler.jsonc`
- Create: `platform/src/env.ts`
- Create: `platform/src/index.ts`
- Create: `platform/src/app.ts`
- Create: `platform/test/health.test.ts`

- [ ] **Step 1: Create an isolated worktree**

Run from the current repository:

```bash
git worktree add ../kaiyuan-platform-launch -b feature/platform-launch-core HEAD
```

Expected: the new worktree is clean and the original worktree still reports its existing user changes.

- [ ] **Step 2: Initialize the Worker package**

Run:

```bash
mkdir -p platform/src platform/test platform/public/assets platform/migrations
cd platform
npm init -y
npm install hono ajv ajv-formats markdown-it @modelcontextprotocol/sdk
npm install -D typescript wrangler vitest @cloudflare/vitest-pool-workers @cloudflare/workers-types tsx
```

Set scripts in `platform/package.json`:

```json
{
  "scripts": {
    "check": "tsc --noEmit",
    "test": "vitest run",
    "dev": "wrangler dev",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "deploy": "wrangler deploy"
  }
}
```

- [ ] **Step 3: Write the failing health test**

```ts
import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("health", () => {
  it("reports the launch service and schema", async () => {
    const response = await SELF.fetch("https://example.test/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "kaiyuan-dashuli",
      schema_version: "project-publication-v1",
    });
  });
});
```

- [ ] **Step 4: Run the test and observe the missing application failure**

Run: `cd platform && npm test -- health.test.ts`

Expected: FAIL because `src/index.ts` and the Worker export do not exist.

- [ ] **Step 5: Implement the minimal Hono entry point**

```ts
// src/app.ts
import { Hono } from "hono";
import type { Bindings } from "./env";

export function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();
  app.get("/health", (c) => c.json({
    ok: true,
    service: "kaiyuan-dashuli",
    schema_version: "project-publication-v1",
  }));
  return app;
}
```

```ts
// src/index.ts
import { createApp } from "./app";
export default createApp();
```

```ts
// src/env.ts
export interface Bindings {
  DB: D1Database;
  BACKUPS: R2Bucket;
  ASSETS: Fetcher;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}
```

- [ ] **Step 6: Run checks**

Run: `cd platform && npm run check && npm test -- health.test.ts`

Expected: TypeScript passes and one health test passes.

- [ ] **Step 7: Commit**

```bash
git add platform
git commit -m "build: scaffold Cloudflare platform app"
```

### Task 2: Lock the Strict Publication Template

**Files:**
- Create: `schema/project-publication-v1.schema.json`
- Create: `platform/src/domain/project.ts`
- Create: `platform/src/domain/validate.ts`
- Create: `platform/test/project-schema.test.ts`

- [ ] **Step 1: Write schema contract tests**

The tests must build one complete fixture with every top-level key and all fourteen section keys, then prove:

```ts
expect(validateProject(completeProject()).ok).toBe(true);
expect(validateProject({ ...completeProject(), unexpected: true }).ok).toBe(false);
expect(validateProject(withoutSection("limitations_and_risks")).ok).toBe(false);
expect(validateProject(withSectionState("background_and_history", "unknown")).ok).toBe(true);
expect(validateProject(withEmptyEvidenceForVerifiedOverview()).ok).toBe(false);
```

- [ ] **Step 2: Run the test and observe missing validator failure**

Run: `cd platform && npm test -- project-schema.test.ts`

Expected: FAIL because `validateProject` is missing.

- [ ] **Step 3: Add the JSON Schema**

Define `project-publication-v1` with `additionalProperties: false`, all top-level keys from the approved spec, repository identity as `platform + platform_repository_id`, fixed section keys, and this shared section shape:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["state", "summary", "body", "key_points", "evidence_ids", "confidence", "updated_at"],
  "properties": {
    "state": {"enum": ["verified", "inferred", "unknown", "conflicting", "stale", "not_applicable"]},
    "summary": {"type": "string", "maxLength": 600},
    "body": {"type": "string", "maxLength": 30000},
    "key_points": {"type": "array", "items": {"type": "string", "maxLength": 500}, "maxItems": 30},
    "evidence_ids": {"type": "array", "items": {"type": "string"}, "uniqueItems": true},
    "confidence": {"enum": ["high", "medium", "low"]},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```

Add a schema rule in `validate.ts` after Ajv validation: a `verified` section must cite at least one existing evidence ID; the minimum publication sections and card decision fields cannot be blank.

- [ ] **Step 4: Export exact TypeScript constants**

```ts
export const SECTION_KEYS = [
  "overview", "problem_and_positioning", "background_and_history",
  "creators_and_organization", "design_philosophy",
  "architecture_and_technology", "core_capabilities",
  "installation_and_usage", "limitations_and_risks",
  "maintenance_and_releases", "ecosystem_and_interoperability",
  "alternatives_and_selection", "community_and_channels",
  "editorial_assessment",
] as const;

export type SectionKey = typeof SECTION_KEYS[number];
export type FieldState = "verified" | "inferred" | "unknown" | "conflicting" | "stale" | "not_applicable";
```

- [ ] **Step 5: Run tests and commit**

Run: `cd platform && npm run check && npm test -- project-schema.test.ts`

Expected: all schema tests pass.

```bash
git add schema/project-publication-v1.schema.json platform/src/domain platform/test/project-schema.test.ts
git commit -m "feat: define strict project publication template"
```

### Task 3: Create D1 Revision Storage

**Files:**
- Create: `platform/migrations/0001_initial.sql`
- Create: `platform/src/storage/projects.ts`
- Create: `platform/src/storage/creators.ts`
- Create: `platform/src/storage/workflow.ts`
- Create: `platform/test/storage.test.ts`
- Modify: `platform/wrangler.jsonc`

- [ ] **Step 1: Write failing D1 tests**

Test that publishing revision 1 and revision 2 leaves both immutable rows, advances only `projects.current_revision_id`, rejects duplicate `platform + repository_id`, and preserves creator roles.

```ts
const first = await projects.insertRevision(db, fixture({ revision: 1 }));
const second = await projects.insertRevision(db, fixture({ revision: 2 }));
expect((await projects.listRevisions(db, first.projectId)).map((x) => x.revision)).toEqual([1, 2]);
expect((await projects.getPublished(db, first.projectId))?.revision).toBe(2);
```

- [ ] **Step 2: Add migration tables and indexes**

Create the entities named in the design. Store full revision documents as canonical JSON text, searchable scalar columns in `projects`, many-valued filters in `project_facets`, and create `projects_fts` with name, aliases, summary, use/avoid and section text.

Critical constraints:

```sql
UNIQUE(platform, platform_repository_id)
UNIQUE(project_id, revision_number)
UNIQUE(actor_id, token_hash)
CHECK(status IN ('draft','in_review','changes_requested','approved','published','stale','archived'))
```

- [ ] **Step 3: Implement focused repositories**

`projects.ts` owns project/revision/facet SQL, `creators.ts` owns creator/role SQL, and `workflow.ts` owns drafts/reviews/reports. No route may contain raw SQL.

- [ ] **Step 4: Apply local migration and run tests**

Run:

```bash
cd platform
npm run db:migrate:local
npm test -- storage.test.ts
```

Expected: migration succeeds; storage tests pass with immutable history and duplicate protection.

- [ ] **Step 5: Commit**

```bash
git add platform/migrations platform/src/storage platform/test/storage.test.ts platform/wrangler.jsonc
git commit -m "feat: add D1 revision storage"
```

### Task 4: Migrate Existing YAML Without Inventing Content

**Files:**
- Create: `scripts/migrate_legacy_publications.py`
- Create: `tests/test_migrate_legacy_publications.py`
- Create: `platform/scripts/import-jsonl.ts`
- Test fixture: `tests/fixtures/legacy-project.yaml`

- [ ] **Step 1: Write failing migration tests**

```python
record = migrate_node("aider", LEGACY_NODE, observed_at="2026-08-02T00:00:00Z")
assert record["schema_version"] == "project-publication-v1"
assert record["card"]["use_when"] == LEGACY_NODE["use_when"]
assert list(record["sections"]) == SECTION_KEYS
assert record["sections"]["overview"]["state"] == "inferred"
assert record["sections"]["background_and_history"]["state"] == "unknown"
assert record["publication"]["migration_status"] == "legacy_imported"
```

Also test deterministic output, explicit unknown reasons, repository URL normalization, and duplicate URL reporting.

- [ ] **Step 2: Run and observe failure**

Run: `python3 -m pytest tests/test_migrate_legacy_publications.py -q`

Expected: FAIL because the migration module is absent.

- [ ] **Step 3: Implement the Python migration**

Reuse `scripts.atlas_lib.load_nodes`, map only existing facts, generate an evidence entry for the legacy source path, and fill every unsupported section with:

```python
{
    "state": "unknown",
    "summary": "旧记录未提供该栏目，等待深度核验。",
    "body": "",
    "key_points": [],
    "evidence_ids": [],
    "confidence": "low",
    "updated_at": observed_at,
}
```

Do not read `graph/edges.yaml` and do not synthesize alternatives.

- [ ] **Step 4: Implement the D1 importer**

`import-jsonl.ts` validates every line with the same Ajv validator, imports in transactions of 100 records, records duplicates separately, and aborts the batch on any invalid record.

- [ ] **Step 5: Verify migration and commit**

Run:

```bash
python3 -m pytest tests/test_migrate_legacy_publications.py -q
python3 scripts/migrate_legacy_publications.py --output build/project-publication-v1.jsonl --report build/migration-report.json
cd platform && npm run check
```

Expected: tests pass; report states source count, output count, duplicate count and unknown-section counts.

```bash
git add scripts/migrate_legacy_publications.py tests/test_migrate_legacy_publications.py tests/fixtures/legacy-project.yaml platform/scripts/import-jsonl.ts
git commit -m "feat: migrate legacy projects into publication records"
```

### Task 5: Enforce Agent Scopes and Draft Workflow

**Files:**
- Create: `platform/src/domain/scopes.ts`
- Create: `platform/src/services/publish.ts`
- Create: `platform/src/http/auth.ts`
- Create: `platform/test/workflow.test.ts`

- [ ] **Step 1: Write failing permission and concurrency tests**

Prove that a public caller cannot create a draft, `draft:create` can create only after a valid creation ticket, `draft:update` cannot approve, a stale `base_revision` returns 409, and the reviewer cannot approve their own high-risk change.

- [ ] **Step 2: Implement API-key authentication**

Hash bearer tokens with Web Crypto SHA-256, query `api_credentials`, reject revoked/expired keys, and attach actor/scopes to Hono context. Never log bearer tokens.

- [ ] **Step 3: Implement the workflow service**

Use these transitions only:

```ts
const TRANSITIONS = {
  draft: ["in_review"],
  in_review: ["changes_requested", "approved"],
  changes_requested: ["in_review"],
  approved: ["published"],
  published: ["stale", "archived"],
  stale: ["in_review", "archived"],
  archived: ["in_review"],
} as const;
```

Publishing validates the complete document, inserts an immutable revision, updates FTS/facets, writes an audit event and closes the draft in one D1 batch.

- [ ] **Step 4: Run tests and commit**

Run: `cd platform && npm test -- workflow.test.ts`

Expected: permission, transition, conflict and audit tests pass.

```bash
git add platform/src/domain/scopes.ts platform/src/services/publish.ts platform/src/http/auth.ts platform/test/workflow.test.ts
git commit -m "feat: add scoped editorial workflow"
```

### Task 6: Build Public Search and Project Pages

**Files:**
- Create: `platform/src/services/search.ts`
- Create: `platform/src/ui/layout.ts`
- Create: `platform/src/ui/public-pages.ts`
- Create: `platform/src/http/public.ts`
- Create: `platform/src/http/api.ts`
- Create: `platform/public/assets/app.css`
- Create: `platform/public/assets/catalog.js`
- Create: `platform/test/public.test.ts`
- Modify: `platform/src/app.ts`

- [ ] **Step 1: Write failing route tests**

Test `/`, `/projects/:id`, `/api/v1/projects/:id`, `/api/v1/search`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/openapi.json`. Verify organic results contain no sponsored insertion and project HTML contains all fixed sections in template order.

- [ ] **Step 2: Implement one query contract**

`search.ts` accepts keyword, entity type, domain, capability, language, license, status, project type, delivery, platform, updated range, unknown policy, sort and cursor. It compiles parameterized SQL only; API and HTML call the same function.

- [ ] **Step 3: Render the public experience**

The first viewport contains the site name, one search field, compact result count and the beginning of catalog content. Use a left filter panel on desktop and a filter drawer on mobile. Cards show name, Chinese name, objective summary, use/avoid, author, language, license and status. No graph canvas is rendered.

Project pages render card facts followed by fourteen fixed sections, evidence links, current revision, updated time and upstream links. Unknown sections are visible but subdued, not silently omitted.

- [ ] **Step 4: Run route and syntax tests**

Run:

```bash
cd platform
npm test -- public.test.ts
npm run check
node --check public/assets/catalog.js
```

Expected: all routes and accessibility landmarks pass; JavaScript syntax is valid.

- [ ] **Step 5: Commit**

```bash
git add platform/src/services/search.ts platform/src/ui platform/src/http/public.ts platform/src/http/api.ts platform/public platform/test/public.test.ts platform/src/app.ts
git commit -m "feat: add public project search experience"
```

### Task 7: Add Creator Search and Aggregation

**Files:**
- Modify: `platform/src/storage/creators.ts`
- Modify: `platform/src/services/search.ts`
- Modify: `platform/src/ui/public-pages.ts`
- Modify: `platform/src/http/public.ts`
- Modify: `platform/src/http/api.ts`
- Create: `platform/test/creators.test.ts`

- [ ] **Step 1: Write failing creator tests**

Test person/organization distinction, explicit role labels, creator search, `/creators/:id`, curated projects before unreviewed repositories, and refusal to merge same-name cross-platform identities without evidence.

- [ ] **Step 2: Implement creator read models**

Creator records include type, names, aliases, biography, official sites, verified social profiles and code-host identities. `creator_project_roles` stores `creator`, `current_owner`, `maintainer`, `organization` and `foundation` separately.

- [ ] **Step 3: Render creator results and pages**

Global search returns grouped projects and creators. Creator pages show objective biography, official links, curated projects and a separately labeled “其他公开仓库，尚未深度整理” section.

- [ ] **Step 4: Verify and commit**

Run: `cd platform && npm test -- creators.test.ts && npm run check`

```bash
git add platform/src/storage/creators.ts platform/src/services/search.ts platform/src/ui/public-pages.ts platform/src/http/public.ts platform/src/http/api.ts platform/test/creators.test.ts
git commit -m "feat: add creator discovery pages"
```

### Task 8: Build the Internal Agent Editorial Studio

**Files:**
- Create: `platform/src/ui/studio-pages.ts`
- Create: `platform/src/http/studio.ts`
- Create: `platform/public/assets/studio.js`
- Create: `platform/test/studio.test.ts`
- Modify: `platform/public/assets/app.css`
- Modify: `platform/src/app.ts`

- [ ] **Step 1: Write failing Studio tests**

Test that unauthenticated callers receive 401, allowed actors see the task queue, each project workspace exposes all fixed tabs, preview reads the draft not the public revision, and publish buttons appear only for allowed scopes.

- [ ] **Step 2: Implement the Studio routes**

Routes:

```text
/studio
/studio/projects/new
/studio/projects/:id
/studio/projects/:id/sections/:section
/studio/projects/:id/evidence
/studio/projects/:id/diff
/studio/projects/:id/preview
/studio/reports
/studio/actors
```

Forms call the same workflow service as MCP. They never construct SQL or mutate published rows directly.

- [ ] **Step 3: Implement the project workspace UI**

Use compact tabs for basic data, repositories, creators, discovery, card, sections, evidence, reports, diff, preview and review. Show save state, base revision, validator errors and actor attribution. Keep stable control dimensions and responsive behavior.

- [ ] **Step 4: Verify and commit**

Run:

```bash
cd platform
npm test -- studio.test.ts
npm run check
node --check public/assets/studio.js
```

```bash
git add platform/src/ui/studio-pages.ts platform/src/http/studio.ts platform/public/assets platform/test/studio.test.ts platform/src/app.ts
git commit -m "feat: add internal editorial studio"
```

### Task 9: Expose Remote MCP Capabilities

**Files:**
- Create: `platform/src/http/mcp.ts`
- Create: `platform/src/services/capabilities.ts`
- Create: `platform/test/mcp.test.ts`
- Modify: `platform/src/app.ts`

- [ ] **Step 1: Write failing MCP protocol tests**

Initialize an MCP session over Streamable HTTP, list tools, call `get_capabilities`, search, check a repository, create a draft with an authorized token, edit one fixed section, and prove a public session cannot call write tools.

- [ ] **Step 2: Register official SDK tools**

Read tools:

```text
get_capabilities
get_catalog_meta
search_projects
get_project
search_creators
get_creator
find_similar_projects
check_repository
```

Report tools:

```text
report_project_change
get_public_report_status
```

Scoped internal tools:

```text
create_project_draft
open_project_workspace
update_project_fields
upsert_project_section
link_creator
add_evidence
preview_project
submit_project_for_review
revise_project_draft
get_project_history
verify_change_report
```

Tool handlers call domain services used by REST/Studio and return structured validation errors. They never write raw records.

- [ ] **Step 3: Verify and commit**

Run: `cd platform && npm test -- mcp.test.ts && npm run check`

Expected: protocol initialization, discovery, reads and scoped writes pass.

```bash
git add platform/src/http/mcp.ts platform/src/services/capabilities.ts platform/test/mcp.test.ts platform/src/app.ts
git commit -m "feat: expose scoped remote MCP tools"
```

### Task 10: Process Change Reports Safely

**Files:**
- Create: `platform/src/services/change-reports.ts`
- Create: `platform/src/scheduled.ts`
- Create: `platform/test/change-reports.test.ts`
- Modify: `platform/src/index.ts`
- Modify: `platform/src/http/api.ts`

- [ ] **Step 1: Write failing report tests**

Test deduplication by project/type/upstream fingerprint, no direct published mutation, evidence URL validation, deterministic low-risk classification, high-risk review routing and scheduled retry state.

- [ ] **Step 2: Implement report intake and scheduled processing**

Supported public types include repository missing/private/redirected/archived/reactivated, release changed, license changed, summary mismatch, maintenance changed and other material change. Mechanical facts can create a verified revision only through the standard publish service; license, ownership, positioning, creators, risks and editorial text always create a review task.

- [ ] **Step 3: Verify and commit**

Run: `cd platform && npm test -- change-reports.test.ts && npm run check`

```bash
git add platform/src/services/change-reports.ts platform/src/scheduled.ts platform/test/change-reports.test.ts platform/src/index.ts platform/src/http/api.ts
git commit -m "feat: add daily change verification queue"
```

### Task 11: Export Backups and Prove Restore

**Files:**
- Create: `platform/src/services/backup.ts`
- Create: `platform/scripts/export-backup.ts`
- Create: `platform/scripts/restore-backup.ts`
- Create: `platform/test/backup.test.ts`
- Modify: `platform/src/scheduled.ts`

- [ ] **Step 1: Write failing backup tests**

Publish two projects and one creator, export a manifest plus JSONL files, restore into an empty D1 database, and assert counts, revision IDs and SHA-256 hashes match.

- [ ] **Step 2: Implement deterministic snapshot format**

The manifest contains schema version, exported time, current project/creator counts, revision counts, filenames and hashes. JSONL is sorted by stable ID and revision. Scheduled backups write the package to R2 under `backups/YYYY/MM/DD/<revision-watermark>/`.

- [ ] **Step 3: Add GitHub-backup handoff**

Emit a signed manifest URL or retrieve the R2 object with a dedicated backup scope. A separate private backup repository workflow can commit these deterministic files without receiving D1 write or deployment credentials.

- [ ] **Step 4: Verify and commit**

Run: `cd platform && npm test -- backup.test.ts && npm run check`

```bash
git add platform/src/services/backup.ts platform/scripts platform/test/backup.test.ts platform/src/scheduled.ts
git commit -m "feat: add deterministic backup and restore"
```

### Task 12: End-to-End Preview and Production Cutover

**Files:**
- Create: `platform/test/e2e/editorial-flow.spec.ts`
- Create: `platform/test/e2e/public-flow.spec.ts`
- Create: `docs/operations/platform-cutover.md`
- Modify: `README.md`
- Modify: `llms.txt`
- Modify: `AGENTS.md`

- [ ] **Step 1: Run the full automated suite**

```bash
python3 -m pytest tests/test_migrate_legacy_publications.py -q
cd platform
npm run check
npm test
npx wrangler d1 migrations apply DB --local
```

Expected: all migration, schema, storage, workflow, route, Studio, MCP, report and backup tests pass.

- [ ] **Step 2: Import the current audited legacy snapshot locally**

```bash
python3 scripts/migrate_legacy_publications.py \
  --output build/project-publication-v1.jsonl \
  --report build/migration-report.json
cd platform
npx tsx scripts/import-jsonl.ts ../build/project-publication-v1.jsonl --local
```

Expected: imported count plus explicit duplicates/invalids equals source count; no silent drops.

- [ ] **Step 3: Verify real browser workflows**

Start `npm run dev`, then run Playwright at desktop 1440x900 and mobile 390x844. Verify search, simultaneous filters, project detail, creator detail, unknown sections, Studio new draft, section edit, evidence, diff, review, publish, MCP discovery and console cleanliness. Capture screenshots and confirm nonblank content with pixel checks.

- [ ] **Step 4: Create Cloudflare preview resources**

Use one-time infrastructure authorization to create D1 and R2 preview resources, apply migrations, import the audited snapshot and deploy a preview Worker. Store identifiers in Cloudflare configuration, not in user-facing content.

- [ ] **Step 5: Probe the preview**

Verify `/health`, `/api/v1/meta`, `/openapi.json`, `/mcp`, `/robots.txt`, `/sitemap.xml`, a project page and a creator page. Compare database revision watermark and migration counts with local artifacts.

- [ ] **Step 6: Run restore rehearsal**

Create an R2 backup, restore into a separate preview D1 database and compare manifest hashes, counts, search results and sampled HTML.

- [ ] **Step 7: Update operational docs**

Document one-time Cloudflare setup, normal Studio publishing, agent credential rotation, backup recovery, preview-to-production promotion, rollback and the rule that daily content maintenance never uses Cloudflare Dashboard.

- [ ] **Step 8: Cut over only after the gate passes**

Deploy the verified revision to production, replace the old Pages content, probe public identity, then bind the user-purchased custom domain. Keep `pages.dev` as preview or redirect according to the cutover document.

- [ ] **Step 9: Final verification and commit**

Run all tests again, `git diff --check`, public browser checks and production probes. Record deployed revision, D1 watermark, backup hash and live URLs.

```bash
git add platform/test/e2e docs/operations/platform-cutover.md README.md llms.txt AGENTS.md
git commit -m "docs: complete platform production cutover"
```

## Plan Self-Review

- Spec coverage: fixed template, no graph dependency, D1 revisions, creator aggregation, Studio, scoped API/MCP, change reports, backup/restore and production replacement are mapped to tasks.
- Deferred by design: real ads, author registration/claims, non-GitHub ingestion and mass deep enrichment are not required for the first replacement launch.
- Safety: the dirty original worktree is never reset or bulk-deployed; the old public site remains available until preview gates pass.
- Consistency: all human, REST and MCP writes call the same workflow/publish services; all reads use the same published revisions and search service.
