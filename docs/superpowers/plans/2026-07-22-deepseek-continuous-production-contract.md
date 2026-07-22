# DeepSeek Continuous Production Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow DeepSeek to accumulate multiple independently validated research batches for days without waiting for GPT-5.6, while preserving a frozen review boundary and preventing untrusted PR code or stale history from bypassing validation.

**Architecture:** DeepSeek owns one long-lived `data/research-*` branch and appends exactly one immutable JSONL/manifest pair per commit. Trusted `pull_request_target` CI validates every accumulated batch from the trusted base contract, reads accepted history only from the trusted base, and never imports from the candidate checkout before the file boundary is enforced. GPT-5.6 reviews a selected head SHA in bulk; only reviewed data can enter `main` or the published graph.

**Tech Stack:** Python 3.12, `unittest`, JSON Schema 2020-12, GitHub Actions, GitHub REST API.

---

### Task 1: Trusted CI boundary

**Files:**
- Add: `.github/workflows/pr-gate.yml`
- Modify: `.github/workflows/research-boundary.yml`
- Modify: `.github/workflows/verify.yml`
- Modify: `tests/test_surface_consistency.py`
- Modify: `scripts/validate_research_worker_diff.py`
- Test: `tests/test_validate_research_worker_diff.py`

- [x] Add failing tests proving that candidate-root `venv.py`, stale-base histories, non-batch research changes, and multi-commit multi-batch accumulation cannot bypass the trusted boundary.
- [x] Run the named tests and confirm they fail for the expected missing safeguards.
- [x] Create the virtual environment from a trusted neutral directory, validate the candidate diff before running any candidate-context command, require `main` as the target, and bind accepted history to the trusted base checkout.
- [x] Change the diff contract from “exactly one commit/two files total” to “each new commit adds exactly one immutable pair; the whole PR contains only valid pairs”.
- [x] Bootstrap a base-owned PR gate in PR #19, classify exact base/head Git snapshots, and remove the legacy candidate-owned `pull_request` execution path from `verify.yml`.
- [x] Serialize accumulation events, require each synchronize head to be the direct child of a previously successful trusted workflow run, replay all history offline, and online-verify only the unique new batch.
- [x] Run the named tests and confirm they pass.

### Task 2: GitHub identity and evidence integrity

**Files:**
- Modify: `scripts/validate_research_batch.py`
- Modify: `schema/research-dossier-v1.schema.json`
- Test: `tests/test_validate_research_batch.py`

- [x] Add failing tests for `pushed_at=null`, forged default-branch OID, inconsistent fork parent/relation, repository API evidence used for unsupported facts, and malformed or overlapping license version ranges.
- [x] Run the named tests and confirm each fails for its intended reason.
- [x] Treat two null monotonic timestamps as equal, fetch branch/ref and parent identity through trusted GitHub APIs, enforce fork consistency, add source-type/path compatibility, and restrict version ranges to a deterministic grammar with non-overlap checks.
- [x] Run the named tests and confirm they pass.

### Task 3: Continuous worker and periodic review contract

**Files:**
- Modify: `docs/operations/deepseek-data-worker.md`
- Modify: `docs/operations/reviewer-publisher-runbook.md`
- Modify: `docs/operations/goal-mode-bootstrap.md`
- Modify: `docs/operations/long-running-goal-mode.md`
- Modify: `data/quarantine/research/worker-config.json`
- Test: `tests/test_surface_consistency.py`

- [x] Add failing surface tests that reject per-batch waiting language, `approval_policy=never`, and any claim that unreviewed quarantine data publishes to the website.
- [x] Run the surface tests and confirm the intended failures.
- [x] Document a long-lived accumulation branch, one pair per commit, periodic frozen-SHA review, request-approval platform mode with a no-request worker rule, and immutable unreviewed quarantine.
- [x] Keep `worker-config.status=blocked` until the trusted workflow is merged and remotely verified.
- [x] Run the surface tests and confirm they pass.

### Task 4: Verification and staged activation

**Files:**
- Verify all files changed above.

- [x] Run `.venv/bin/python -m unittest discover -s tests -v` and require zero failures.
- [x] Run `.venv/bin/python scripts/validate_graph.py` and require `OK`.
- [x] Run `.venv/bin/python scripts/run_retrieval_eval.py` and require `67/67`.
- [x] Run the site/release build commands used by `verify.yml`, JSON/YAML parsing, Python compilation, and `git diff --check`.
- [x] Merge the trusted PR gate bootstrap as PR #19 while keeping `worker-config.status=blocked`.
- [x] Merge contract PR #21 with `worker-config.status=blocked`; main verify passed at `d21b523`.
- [x] Run harmless config-only fixture PR #22; `pr-gate / test-and-build` and `research-boundary / research-boundary` both passed, then close it without merge.
- [x] Add both `test-and-build` and `research-boundary` to protected-main required checks with strict updates enabled.
- [x] Merge separate activation PR #23, switch `worker-config.status` to `ready`, and verify main at `53bd564`.
- [x] Final DeepSeek bootstrap text is live in `docs/operations/goal-mode-bootstrap.md`; the first accumulation run starts with 20 repositories from `since=0`.

### Current independent blocker

The research worker contract is active. Website publication is a separate line: `pages-deploy` for main `53bd564` still fails in Cloudflare Wrangler with `Authentication error [code: 10000]`. Creating or rotating the Cloudflare Pages API token and replacing the GitHub Secret requires explicit account authorization and is not a DeepSeek data-worker task.
