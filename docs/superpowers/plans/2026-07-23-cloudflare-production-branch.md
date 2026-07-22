# Cloudflare Pages Production Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every verified `main` build is deployed to the Cloudflare Pages production environment instead of a detached-HEAD preview environment.

**Architecture:** Keep checkout pinned to the verified commit SHA for provenance. Pass `--branch main` explicitly to Wrangler so Cloudflare classifies the direct upload as production, then retain the existing live metadata probe as the release gate.

**Tech Stack:** GitHub Actions YAML, Cloudflare Wrangler Pages deployment, Python `unittest`, GitHub CLI.

---

### Task 1: Add a production-branch regression assertion

**Files:**
- Modify: `tests/test_surface_consistency.py`

- [ ] Add `self.assertIn("--branch main", workflow)` to `test_pages_deploy_waits_for_verified_main_and_uses_a_supported_probe_identity`.
- [ ] Run `.venv/bin/python -m unittest tests.test_surface_consistency.SurfaceConsistencyTests.test_pages_deploy_waits_for_verified_main_and_uses_a_supported_probe_identity -v`.
- [ ] Confirm it fails because the current Wrangler command does not declare the production branch.

### Task 2: Bind Wrangler to the production branch

**Files:**
- Modify: `.github/workflows/pages-deploy.yml`

- [ ] Change the Wrangler command to `pages deploy build/site --project-name kai-yuan-da-shu-li --branch main`.
- [ ] Re-run the targeted test and confirm it passes.
- [ ] Run `.venv/bin/python -m unittest discover -s tests -v` and confirm the complete suite passes.

### Task 3: Record the resolved release path

**Files:**
- Modify: `docs/operations/cloudflare-pages-connection.md`
- Modify: `docs/operations/operations-status.md`

- [ ] Record that run `29963596909` authenticated and uploaded successfully but produced the `head` preview alias because checkout was detached.
- [ ] Record the explicit `--branch main` invariant and the successful replacement deployment evidence.
- [ ] Push the branch, open and merge a pull request, wait for `verify` and `pages-deploy`, then compare live `source_revision`, `catalog_hash`, `node_count`, and `edge_count` with merged `main`.
