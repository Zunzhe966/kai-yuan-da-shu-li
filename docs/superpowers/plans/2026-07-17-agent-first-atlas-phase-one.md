# Agent-First Open Source Atlas Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally testable, low-resource first release of 开源大梳理 with static human and machine surfaces, reproducible release packaging, and a passive GitHub-based change-feedback inbox that only records real mismatches discovered by visiting agents.

**Architecture:** The Mac remains the build, verification, and review machine. Python standard-library build scripts transform the repository’s YAML records into versioned JSON/JSONL, small search slices, and static HTML; GitHub stores source, formal data, design history, and CI evidence; a future BandwagonHost Nginx origin serves only immutable static files behind Cloudflare. Passive change feedback arrives as narrowly structured GitHub issues, is imported and deduplicated locally, and never changes formal catalog data until Codex independently verifies the upstream evidence.

**Tech Stack:** Python 3.12 standard library, existing YAML-like records and `scripts/atlas_lib.py`, `unittest`, static HTML/CSS/JavaScript, GitHub CLI, GitHub Actions, Nginx, Cloudflare cache configuration.

---

## Scope and safety boundaries

- This plan does not modify `graph/edges.yaml`, `schema/ontology.yaml`, `data/domains/blockchain/`, or `docs/taxonomy-blockchain.md`; those paths currently contain another window’s work.
- Execute the plan in an isolated Git worktree created with `superpowers:using-git-worktrees`, starting from the latest committed `main`.
- Do not touch `/Users/zhangxuetao/Desktop/八卦编程语言` or `/Users/zhangxuetao/Desktop/八卦模型训练方案`.
- Do not deploy a crawler, model, Neo4j, Elasticsearch, vector database, PostgreSQL, Redis, or feedback database on the 1 GB BandwagonHost server.
- Do not enable GitHub Pages, buy a domain, change DNS, change Cloudflare, or change the live server during this plan. Phase B produces verified packages and configuration examples only.
- Do not connect real advertising. Human advertising and agent sponsorship receive documented empty interfaces only and cannot affect objective ranking.
- A visiting agent never receives a work assignment. It reports nothing when the site record still matches the upstream repository.
- Accepted passive feedback is limited to address/accessibility, redirect, archive/reactivation, release, license, summary, deployment, and maintenance mismatches already visible in the catalog.

## Planned file map

### Core publication model

- `scripts/published_catalog.py` — convert current node dictionaries into stable public records and compute `content_hash`.
- `scripts/export_catalog_v1.py` — write versioned machine-readable JSON/JSONL slices without changing the legacy exporter.
- `schema/published-project-v1.schema.json` — document the exact public project record contract without touching the edited ontology file.
- `tests/test_published_catalog.py` — unit tests for stable hashes, public fields, and deterministic ordering.
- `tests/test_export_catalog_v1.py` — temporary-directory tests for all machine artifacts.

### Static human and agent site

- `scripts/build_static_site.py` — generate HTML, machine discovery files, sitemap, copied API slices, and precompressed text assets.
- `site_src/assets/site.css` — small responsive presentation layer.
- `site_src/assets/site.js` — in-browser filtering over the prebuilt compact search index.
- `tests/test_build_static_site.py` — verify human pages, agent discovery, sponsorship separation, and links.

### Reproducible release and future origin deployment

- `scripts/build_release.py` — produce a deterministic tar archive and SHA-256 manifest from `build/site/`.
- `tests/test_build_release.py` — verify archive contents, path safety, and repeatable hashes.
- `.github/workflows/verify.yml` — run validation, tests, exports, and build checks without publishing the site.
- `ops/nginx/kai-yuan-da-shu-li.conf.example` — isolated loopback origin on port 8088, not port 443.
- `ops/cloudflare/cache-rules.md` — exact cache policy to apply only after a domain is approved.
- `docs/operations/static-release.md` — local build, verification, retention, rollback, and server resource boundaries.

### Passive change feedback

- `schema/change-report-v1.schema.json` — narrow report contract.
- `.github/ISSUE_TEMPLATE/agent-change-report.yml` — short issue form for agents that already discovered a mismatch.
- `.github/ISSUE_TEMPLATE/config.yml` — link normal contributions away from the passive feedback channel.
- `docs/agent-change-feedback.md` — machine-readable and human-readable reporting rules.
- `scripts/feedback_lib.py` — parse issue bodies, validate fields, normalize evidence, fingerprint events, and assign review priority.
- `scripts/import_github_feedback.py` — read open GitHub issues through authenticated `gh`, aggregate duplicates, and cap confirmation counts.
- `scripts/build_daily_change_digest.py` — create one non-empty daily review list from deduplicated events.
- `scripts/finish_change_event.py` — record a verified resolution, remove local temporary state, and optionally delete processed GitHub issues only when explicitly requested.
- `tests/fixtures/github_change_issues.json` — representative GitHub issue payloads.
- `tests/test_feedback_lib.py` — parser, validation, fingerprint, and priority tests.
- `tests/test_feedback_pipeline.py` — import, deduplication, daily digest, and cleanup tests.
- `data/verification/.gitkeep` — versioned home for compact verified resolution evidence.
- `.gitignore` — ignore `build/` and `var/feedback/`, while keeping formal verification records tracked.

## Phase A — Static catalog and retrieval surfaces

### Task 1: Establish an isolated test harness and public record contract

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_published_catalog.py`
- Create: `schema/published-project-v1.schema.json`
- Create: `scripts/published_catalog.py`

- [ ] **Step 1: Create the failing public-record tests**

```python
# tests/test_published_catalog.py
import unittest

from scripts.published_catalog import build_public_record, stable_content_hash


SAMPLE = {
    "id": "example-tool",
    "domain": "devtools",
    "name": "Example Tool",
    "repo": "https://github.com/example/tool",
    "summary": "A useful tool.",
    "tag_list": ["cli", "search"],
    "language": "Python",
    "license": "MIT",
    "status": "active",
    "use_when": "Need a small CLI.",
    "avoid_when": "Need a hosted service.",
    "niche": "small CLI",
}


class PublishedCatalogTests(unittest.TestCase):
    def test_hash_ignores_input_dictionary_order(self):
        reordered = dict(reversed(list(SAMPLE.items())))
        self.assertEqual(stable_content_hash(SAMPLE), stable_content_hash(reordered))

    def test_public_record_contains_verification_baseline(self):
        record = build_public_record("example-tool", SAMPLE)
        self.assertEqual(record["id"], "example-tool")
        self.assertEqual(record["tags"], ["cli", "search"])
        self.assertEqual(record["verification_status"], "unverified")
        self.assertRegex(record["content_hash"], r"^[0-9a-f]{64}$")
        self.assertNotIn("tag_list", record)

    def test_hash_changes_when_visible_summary_changes(self):
        changed = dict(SAMPLE, summary="A changed description.")
        self.assertNotEqual(stable_content_hash(SAMPLE), stable_content_hash(changed))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run: `.venv/bin/python -m unittest tests.test_published_catalog -v`

Expected: `ModuleNotFoundError: No module named 'scripts.published_catalog'`.

- [ ] **Step 3: Add the complete published record implementation**

```python
# scripts/published_catalog.py
from __future__ import annotations

import hashlib
import json
from typing import Any


VISIBLE_FIELDS = (
    "id",
    "domain",
    "name",
    "repo",
    "summary",
    "tags",
    "language",
    "license",
    "status",
    "use_when",
    "avoid_when",
    "niche",
)


def _visible_payload(node_id: str, node: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": node_id,
        "domain": node.get("domain", ""),
        "name": node.get("name", ""),
        "repo": node.get("repo", ""),
        "summary": node.get("summary", ""),
        "tags": sorted(node.get("tag_list", node.get("tags", []))),
        "language": node.get("language", ""),
        "license": node.get("license", ""),
        "status": node.get("status", ""),
        "use_when": node.get("use_when", ""),
        "avoid_when": node.get("avoid_when", ""),
        "niche": node.get("niche", ""),
    }


def stable_content_hash(node: dict[str, Any], node_id: str | None = None) -> str:
    payload = _visible_payload(node_id or str(node.get("id", "")), node)
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def build_public_record(node_id: str, node: dict[str, Any]) -> dict[str, Any]:
    record = _visible_payload(node_id, node)
    record.update(
        {
            "source_updated_at": node.get("source_updated_at") or None,
            "verified_at": node.get("verified_at") or None,
            "verification_status": node.get("verification_status", "unverified"),
            "evidence_urls": node.get("evidence_urls", [record["repo"]]),
            "content_hash": stable_content_hash(node, node_id),
        }
    )
    return record
```

- [ ] **Step 4: Add the JSON Schema for the public contract**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/schema/published-project-v1.schema.json",
  "title": "Published project record v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "domain", "name", "repo", "summary", "tags", "status", "verification_status", "evidence_urls", "content_hash"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]*$"},
    "domain": {"type": "string"},
    "name": {"type": "string"},
    "repo": {"type": "string", "format": "uri"},
    "summary": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}, "uniqueItems": true},
    "language": {"type": "string"},
    "license": {"type": "string"},
    "status": {"type": "string"},
    "use_when": {"type": "string"},
    "avoid_when": {"type": "string"},
    "niche": {"type": "string"},
    "source_updated_at": {"type": ["string", "null"]},
    "verified_at": {"type": ["string", "null"]},
    "verification_status": {"enum": ["unverified", "verified", "needs_review", "missing", "archived"]},
    "evidence_urls": {"type": "array", "items": {"type": "string", "format": "uri"}},
    "content_hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"}
  }
}
```

- [ ] **Step 5: Run the focused test and commit**

Run: `.venv/bin/python -m unittest tests.test_published_catalog -v`

Expected: three tests pass.

```bash
git add tests/__init__.py tests/test_published_catalog.py scripts/published_catalog.py schema/published-project-v1.schema.json
git commit -m "feat: define stable published project records"
```

### Task 2: Export deterministic JSON, JSONL, domain, node, and search slices

**Files:**
- Create: `tests/test_export_catalog_v1.py`
- Create: `scripts/export_catalog_v1.py`
- Modify: `.gitignore`

- [ ] **Step 1: Write a failing temporary-directory export test**

```python
# tests/test_export_catalog_v1.py
import json
import tempfile
import unittest
from pathlib import Path

from scripts.export_catalog_v1 import export_catalog


class ExportCatalogV1Tests(unittest.TestCase):
    def test_export_writes_small_versioned_surfaces(self):
        nodes = {
            "alpha": {
                "domain": "devtools", "name": "Alpha", "repo": "https://github.com/a/a",
                "summary": "Alpha summary", "tag_list": ["cli"], "status": "active",
            },
            "beta": {
                "domain": "backend", "name": "Beta", "repo": "https://github.com/b/b",
                "summary": "Beta summary", "tag_list": ["api"], "status": "active",
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            export_catalog(root, nodes, [], generated_at="2026-07-17T00:00:00Z")
            meta = json.loads((root / "meta.json").read_text())
            self.assertEqual(meta["node_count"], 2)
            self.assertTrue((root / "catalog.jsonl").exists())
            self.assertTrue((root / "domains/devtools.json").exists())
            self.assertTrue((root / "nodes/alpha.json").exists())
            search = json.loads((root / "search-index.json").read_text())
            self.assertEqual([item["id"] for item in search], ["alpha", "beta"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and confirm the exporter is missing**

Run: `.venv/bin/python -m unittest tests.test_export_catalog_v1 -v`

Expected: import failure for `scripts.export_catalog_v1`.

- [ ] **Step 3: Implement the deterministic exporter**

Create `scripts/export_catalog_v1.py` with these public functions and behaviors:

```python
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from atlas_lib import load_edges, load_nodes
from published_catalog import build_public_record


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def export_catalog(
    output: Path,
    nodes: dict[str, dict[str, Any]],
    edges: list[dict[str, str]],
    generated_at: str,
) -> None:
    records = [build_public_record(node_id, nodes[node_id]) for node_id in sorted(nodes)]
    domains = sorted({record["domain"] for record in records})
    output.mkdir(parents=True, exist_ok=True)
    _write_json(output / "meta.json", {
        "schema_version": "1.0.0",
        "generated_at": generated_at,
        "node_count": len(records),
        "edge_count": len(edges),
        "domains": domains,
        "surfaces": {
            "catalog_jsonl": "catalog.jsonl",
            "search_index": "search-index.json",
            "domain_template": "domains/{domain}.json",
            "node_template": "nodes/{id}.json",
        },
        "feedback_policy": "report-only-material-mismatches",
    })
    _write_json(output / "catalog.json", {"nodes": records, "edges": edges})
    (output / "catalog.jsonl").write_text(
        "".join(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )
    _write_json(output / "search-index.json", [
        {
            "id": record["id"], "domain": record["domain"], "name": record["name"],
            "summary": record["summary"], "tags": record["tags"],
            "language": record["language"], "status": record["status"],
        }
        for record in records
    ])
    for domain in domains:
        _write_json(output / "domains" / f"{domain}.json", [
            record for record in records if record["domain"] == domain
        ])
    for record in records:
        _write_json(output / "nodes" / f"{record['id']}.json", record)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist/v1")
    args = parser.parse_args()
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    export_catalog(args.output, load_nodes(None), load_edges(), generated_at)
    print(f"wrote catalog v1 to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Ignore transient build and inbox files**

Append exactly these entries to `.gitignore`:

```gitignore
build/
var/feedback/
```

- [ ] **Step 5: Run focused tests, export the real catalog, and inspect sizes**

Run: `.venv/bin/python -m unittest tests.test_export_catalog_v1 -v`

Expected: one test passes.

Run: `.venv/bin/python scripts/export_catalog_v1.py`

Expected: `dist/v1/` contains `meta.json`, `catalog.json`, `catalog.jsonl`, `search-index.json`, domain slices, and node records.

Run: `du -sh dist/v1 && find dist/v1 -type f | wc -l`

Expected: the output remains comfortably below 10 MB and contains at least one file per current node plus domain and top-level indexes.

- [ ] **Step 6: Commit the machine surfaces**

```bash
git add .gitignore scripts/export_catalog_v1.py tests/test_export_catalog_v1.py dist/v1
git commit -m "feat: export versioned machine catalog surfaces"
```

### Task 3: Build the low-resource human site from the same records

**Files:**
- Create: `tests/test_build_static_site.py`
- Create: `scripts/build_static_site.py`
- Create: `site_src/assets/site.css`
- Create: `site_src/assets/site.js`

- [ ] **Step 1: Write failing site-generation tests**

```python
# tests/test_build_static_site.py
import tempfile
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class BuildStaticSiteTests(unittest.TestCase):
    def test_site_has_human_and_agent_surfaces_without_ad_code(self):
        nodes = {
            "alpha": {
                "domain": "devtools", "name": "Alpha", "repo": "https://github.com/a/a",
                "summary": "Alpha summary", "tag_list": ["cli"], "status": "active",
                "use_when": "Need CLI", "avoid_when": "Need GUI",
            }
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, nodes, [], "https://atlas.example")
            home = (output / "index.html").read_text()
            project = (output / "projects/alpha/index.html").read_text()
            llms = (output / "llms.txt").read_text()
            self.assertIn("Alpha", home)
            self.assertIn("Need CLI", project)
            self.assertIn("/api/v1/meta.json", llms)
            self.assertTrue((output / "api/v1/nodes/alpha.json").exists())
            self.assertNotIn("adsbygoogle", home)
            self.assertNotIn("sponsored_results", (output / "api/v1/nodes/alpha.json").read_text())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and confirm site builder is missing**

Run: `.venv/bin/python -m unittest tests.test_build_static_site -v`

Expected: import failure for `scripts.build_static_site`.

- [ ] **Step 3: Implement `build_static_site.py`**

The implementation must:

1. call `export_catalog(output / "api/v1", nodes, edges, generated_at)`;
2. copy `site_src/assets/site.css` and `site_src/assets/site.js` to `assets/`;
3. generate `index.html`, one `domains/<domain>/index.html` per domain, and one `projects/<id>/index.html` per node;
4. HTML-escape every catalog string with `html.escape`;
5. put objective project data in ordinary HTML and machine JSON, with no ad script and no sponsored record;
6. generate `llms.txt`, `robots.txt`, and `sitemap.xml` from the `base_url` argument;
7. precompress `.html`, `.json`, `.jsonl`, `.css`, `.js`, `.txt`, and `.xml` files as reproducible `.gz` files using `gzip.GzipFile(mtime=0)`;
8. accept `--output build/site` and `--base-url https://example.invalid` command-line arguments;
9. print the generated page and byte counts.

Use these exact top-level function signatures so tests can target focused responsibilities: `render_home(records: list[dict], domains: list[str]) -> str`, `render_domain(domain: str, records: list[dict]) -> str`, `render_project(record: dict) -> str`, `write_discovery_files(output: Path, records: list[dict], base_url: str) -> None`, `precompress_text_assets(output: Path) -> None`, and `build_site(output: Path, nodes: dict, edges: list[dict], base_url: str) -> None`.

The home page search box must load only `/api/v1/search-index.json`; it must not call `scripts/http_api.py` or any dynamic search endpoint.

- [ ] **Step 4: Add a compact, readable stylesheet**

Create `site_src/assets/site.css` with a maximum width of 72rem, system fonts, high-contrast focus states, a responsive project-card grid, visible labels for status and domain, and no external font or image requests. Keep the uncompressed file below 12 KB.

- [ ] **Step 5: Add browser-side filtering with no framework**

Create `site_src/assets/site.js` that:

```javascript
const normalize = value => String(value || "").toLowerCase();

async function loadIndex() {
  const response = await fetch("/api/v1/search-index.json", { cache: "force-cache" });
  if (!response.ok) throw new Error(`search index ${response.status}`);
  return response.json();
}

function matches(item, query, domain) {
  const text = normalize([item.name, item.summary, item.language, ...(item.tags || [])].join(" "));
  return (!query || text.includes(normalize(query))) && (!domain || item.domain === domain);
}

window.AtlasSearch = { loadIndex, matches };
```

Wire these functions to the home page’s text and domain inputs, render at most 50 matches, and show a direct project link for each result.

- [ ] **Step 6: Run the focused tests and real build**

Run: `.venv/bin/python -m unittest tests.test_build_static_site -v`

Expected: one test passes.

Run: `.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid`

Expected: static HTML, machine API slices, discovery files, and `.gz` companions are produced with no network access.

Run: `find build/site -type f | wc -l && du -sh build/site`

Expected: the site remains below 20 MB before release archiving.

- [ ] **Step 7: Commit the static site builder**

```bash
git add scripts/build_static_site.py site_src/assets/site.css site_src/assets/site.js tests/test_build_static_site.py
git commit -m "feat: build low-resource human and agent site"
```

### Task 4: Add cross-surface acceptance tests and preserve objective ranking

**Files:**
- Create: `tests/test_surface_consistency.py`
- Modify: `scripts/build_static_site.py`

- [ ] **Step 1: Write failing consistency tests**

```python
# tests/test_surface_consistency.py
import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class SurfaceConsistencyTests(unittest.TestCase):
    def test_every_machine_node_has_a_human_page_and_same_summary(self):
        nodes = {
            "alpha": {
                "domain": "devtools", "name": "Alpha", "repo": "https://github.com/a/a",
                "summary": "Same canonical summary", "tag_list": ["cli"], "status": "active",
            }
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build_site(output, nodes, [], "https://atlas.example")
            record = json.loads((output / "api/v1/nodes/alpha.json").read_text())
            html = (output / "projects/alpha/index.html").read_text()
            self.assertIn(record["summary"], html)
            self.assertNotIn("paid_rank", json.dumps(record))
            self.assertNotIn("sponsored", json.dumps(record).lower())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and observe any escaping or output mismatch**

Run: `.venv/bin/python -m unittest tests.test_surface_consistency -v`

Expected: failure until the human page uses the same canonical public record passed to the machine exporter.

- [ ] **Step 3: Make `build_site` construct records once**

Refactor `build_site` so it builds a sorted list with `build_public_record`, passes those records to HTML renderers, and passes the same source nodes to `export_catalog`. Do not add sponsorship fields to public records or search scoring.

- [ ] **Step 4: Run all Phase A checks and commit**

Run: `.venv/bin/python scripts/validate_graph.py`

Expected: `OK` for the committed domains in the isolated worktree.

Run: `.venv/bin/python -m unittest discover -s tests -v`

Expected: every Phase A test passes.

Run: `.venv/bin/python scripts/run_retrieval_eval.py`

Expected: the existing retrieval threshold remains at or above 80%.

```bash
git add scripts/build_static_site.py tests/test_surface_consistency.py
git commit -m "test: enforce consistent objective catalog surfaces"
```

## Phase B — Reproducible release, GitHub verification, and future static origin

### Task 5: Produce deterministic release archives and manifests

**Files:**
- Create: `tests/test_build_release.py`
- Create: `scripts/build_release.py`

- [ ] **Step 1: Write failing deterministic-release tests**

```python
# tests/test_build_release.py
import tempfile
import unittest
from pathlib import Path

from scripts.build_release import build_release


class BuildReleaseTests(unittest.TestCase):
    def test_identical_site_trees_produce_identical_release_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site = root / "site"
            site.mkdir()
            (site / "index.html").write_text("hello\n")
            first = build_release(site, root / "one", "test-release")
            second = build_release(site, root / "two", "test-release")
            self.assertEqual(first["sha256"], second["sha256"])
            self.assertEqual(first["file_count"], 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and confirm the release module is missing**

Run: `.venv/bin/python -m unittest tests.test_build_release -v`

Expected: import failure for `scripts.build_release`.

- [ ] **Step 3: Implement a safe deterministic tarball builder**

`scripts/build_release.py` must:

- sort every source path;
- reject symlinks and paths outside the site root;
- set tar member `mtime=0`, `uid=0`, `gid=0`, `uname=""`, and `gname=""`;
- create `build/releases/<release-name>.tar.gz` with gzip `mtime=0`;
- write `<release-name>.manifest.json` containing release name, file count, uncompressed bytes, archive bytes, and SHA-256;
- expose `build_release(site: Path, output: Path, release_name: str) -> dict`;
- default the CLI release name to the current Git commit short hash from `git rev-parse --short HEAD`.

- [ ] **Step 4: Run focused tests and build a real release**

Run: `.venv/bin/python -m unittest tests.test_build_release -v`

Expected: one test passes.

Run: `.venv/bin/python scripts/build_release.py --site build/site --output build/releases`

Expected: one `.tar.gz` and one `.manifest.json` appear under `build/releases/`.

Run: `shasum -a 256 build/releases/*.tar.gz`

Expected: the printed hash equals the manifest’s `sha256` value.

- [ ] **Step 5: Commit the release builder**

```bash
git add scripts/build_release.py tests/test_build_release.py
git commit -m "feat: build deterministic static releases"
```

### Task 6: Add non-publishing GitHub verification

**Files:**
- Create: `.github/workflows/verify.yml`
- Create: `docs/operations/static-release.md`

- [ ] **Step 1: Add the GitHub Actions workflow**

```yaml
name: verify

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m venv .venv
      - run: .venv/bin/pip install -r requirements.txt
      - run: .venv/bin/python scripts/validate_graph.py
      - run: .venv/bin/python -m unittest discover -s tests -v
      - run: .venv/bin/python scripts/export_catalog_v1.py --output build/catalog-v1
      - run: .venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
      - run: .venv/bin/python scripts/build_release.py --site build/site --output build/releases --release-name ci
      - uses: actions/upload-artifact@v4
        with:
          name: verified-static-release
          path: build/releases/
          retention-days: 7
```

The workflow intentionally does not request write permission and does not deploy or make the site public.

- [ ] **Step 2: Document the exact local release sequence**

`docs/operations/static-release.md` must include these commands in order:

```bash
.venv/bin/python scripts/validate_graph.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases
shasum -a 256 build/releases/*.tar.gz
```

It must also state that GitHub is the source/history backup, `build/` is disposable, only the newest three extracted releases may remain on BandwagonHost, and rollback means changing a `current` symlink to a previously verified release.

- [ ] **Step 3: Validate the workflow syntax and commit**

Run: `.venv/bin/python -c 'import yaml; yaml.safe_load(open(".github/workflows/verify.yml")); print("workflow yaml ok")'`

Expected: `workflow yaml ok`. The existing `mcp` dependency provides PyYAML in the current environment; if it does not, use Ruby’s installed YAML parser with `ruby -e 'require "yaml"; YAML.load_file(ARGV[0]); puts "workflow yaml ok"' .github/workflows/verify.yml` without adding a runtime dependency.

```bash
git add .github/workflows/verify.yml docs/operations/static-release.md
git commit -m "ci: verify static atlas releases"
```

### Task 7: Define the isolated Nginx origin and Cloudflare cache policy

**Files:**
- Create: `ops/nginx/kai-yuan-da-shu-li.conf.example`
- Create: `ops/cloudflare/cache-rules.md`
- Modify: `docs/operations/static-release.md`

- [ ] **Step 1: Add an origin config that cannot take over Xray port 443**

```nginx
server {
    listen 127.0.0.1:8088;
    server_name _;
    root /srv/kai-yuan-da-shu-li/current;
    index index.html;

    access_log /var/log/nginx/kai-yuan-da-shu-li.access.log combined buffer=32k flush=5m;
    error_log /var/log/nginx/kai-yuan-da-shu-li.error.log warn;

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    location /api/v1/ {
        try_files $uri =404;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Cache-Control "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" always;
    }

    location ~* \.(?:css|js|json|jsonl|html|txt|xml)$ {
        gzip_static on;
        add_header Cache-Control "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" always;
    }

    client_max_body_size 16k;
    limit_except GET HEAD { deny all; }
}
```

- [ ] **Step 2: Document Cloudflare rules in application order**

`ops/cloudflare/cache-rules.md` must specify:

1. bypass cache for a future `/feedback/` path;
2. cache `/api/v1/nodes/*` and `/api/v1/domains/*` for 24 hours at the edge;
3. cache versioned assets and `.gz` companions for 30 days;
4. cache HTML for 15 minutes with stale serving enabled;
5. respect origin ETag and compression;
6. never cache `POST`, authorization headers, or cookies;
7. configure a conservative bot/rate rule only after observing legitimate agent traffic;
8. keep Cloudflare and origin logs minimal and exclude query contents from long-term retention.

- [ ] **Step 3: Add the deployment gate to the release operations document**

State that deployment may begin only after the user approves a domain/path, a loopback `curl` smoke test passes, current Nginx and Xray configurations are backed up, and `nginx -t` succeeds. The atlas origin stays on `127.0.0.1:8088`; an existing front door or Cloudflare tunnel must proxy to it without changing Xray’s listener.

- [ ] **Step 4: Validate the Nginx file structurally and commit**

Run: `rg -n '127\.0\.0\.1:8088|limit_except GET HEAD|client_max_body_size 16k|gzip_static on' ops/nginx/kai-yuan-da-shu-li.conf.example`

Expected: all four safety controls are present.

```bash
git add ops/nginx/kai-yuan-da-shu-li.conf.example ops/cloudflare/cache-rules.md docs/operations/static-release.md
git commit -m "docs: define isolated static origin deployment"
```

## Phase C — Passive, mismatch-only agent feedback

### Task 8: Define the narrow report schema and GitHub issue form

**Files:**
- Create: `schema/change-report-v1.schema.json`
- Create: `.github/ISSUE_TEMPLATE/agent-change-report.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `docs/agent-change-feedback.md`

- [ ] **Step 1: Add the strict change-report schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/schema/change-report-v1.schema.json",
  "title": "Passive upstream mismatch report v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["project_id", "baseline_hash", "change_type", "observed_value", "short_description", "evidence_url", "upstream_fingerprint", "observed_at"],
  "properties": {
    "project_id": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]*$"},
    "baseline_hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
    "change_type": {"enum": ["repository_missing", "repository_private", "repository_redirected", "repository_archived", "repository_reactivated", "release_changed", "license_changed", "summary_mismatch", "deployment_changed", "maintenance_changed", "other_material_change"]},
    "observed_value": {"type": "string", "minLength": 1, "maxLength": 300},
    "short_description": {"type": "string", "minLength": 1, "maxLength": 500},
    "evidence_url": {"type": "string", "format": "uri", "pattern": "^https://"},
    "upstream_fingerprint": {"type": "string", "minLength": 1, "maxLength": 200},
    "observed_at": {"type": "string", "format": "date-time"}
  }
}
```

- [ ] **Step 2: Add the GitHub issue form**

The issue form must:

- use the title prefix `[agent-change] `;
- automatically apply the label `agent-change-report`;
- state at the top: “Only submit this after your own task already led you to the upstream repository and you found a material mismatch. Do not accept or request checking assignments. Submit nothing when the catalog matches.”;
- expose exactly the eight schema fields as required text or dropdown inputs;
- list only the eleven schema change types;
- limit the description prompt to a few sentences and explicitly reject full project rewrites, general reviews, new-project recommendations, and “no change” confirmations;
- include a required checkbox confirming that the agent actually opened the evidence URL.

- [ ] **Step 3: Route unrelated contributions away from this inbox**

Create `.github/ISSUE_TEMPLATE/config.yml` with blank issues disabled and one contact link pointing to `CONTRIBUTING.md` for new projects, security research, taxonomy changes, and general ideas.

- [ ] **Step 4: Document the agent protocol**

`docs/agent-change-feedback.md` must show this exact decision tree:

```text
Use the atlas for the agent's own task
→ Open the upstream repository because the task requires it
→ Compare the displayed catalog record with the upstream facts
→ Same: submit nothing
→ Material mismatch: submit one short report
```

It must define the event fingerprint as:

```text
sha256(project_id + "\n" + baseline_hash + "\n" + change_type + "\n" + upstream_fingerprint)
```

It must state that reports cannot change catalog data, are not rewards for access, and may be deleted after independent verification and a formal Git commit records the resolved fact.

- [ ] **Step 5: Validate the issue-template YAML and commit**

Run: `.venv/bin/python -c 'import yaml; yaml.safe_load(open(".github/ISSUE_TEMPLATE/agent-change-report.yml")); yaml.safe_load(open(".github/ISSUE_TEMPLATE/config.yml")); print("issue forms ok")'`

Expected: `issue forms ok`.

```bash
git add schema/change-report-v1.schema.json .github/ISSUE_TEMPLATE/agent-change-report.yml .github/ISSUE_TEMPLATE/config.yml docs/agent-change-feedback.md
git commit -m "feat: define passive mismatch-only feedback"
```

### Task 9: Parse, validate, fingerprint, and prioritize feedback

**Files:**
- Create: `tests/fixtures/github_change_issues.json`
- Create: `tests/test_feedback_lib.py`
- Create: `scripts/feedback_lib.py`

- [ ] **Step 1: Add representative issue fixtures**

Create three issue objects:

1. issue 101 reports `repository_missing` for `alpha` with baseline hash equal to 64 lowercase `a` characters and upstream fingerprint `404`;
2. issue 102 repeats the same event with different wording;
3. issue 103 reports `summary_mismatch` for `beta` with a different fingerprint.

Each fixture must use GitHub issue-form headings such as `### Project ID`, followed by the submitted value, and include `id` (the GitHub GraphQL node ID), `number`, `title`, `body`, `url`, `createdAt`, and `author.login`.

- [ ] **Step 2: Write failing parser and fingerprint tests**

```python
# tests/test_feedback_lib.py
import json
import unittest
from pathlib import Path

from scripts.feedback_lib import event_fingerprint, parse_issue, validate_report


FIXTURES = Path(__file__).parent / "fixtures/github_change_issues.json"


class FeedbackLibTests(unittest.TestCase):
    def test_duplicate_wording_has_same_event_fingerprint(self):
        issues = json.loads(FIXTURES.read_text())
        first = parse_issue(issues[0])
        second = parse_issue(issues[1])
        self.assertEqual(event_fingerprint(first), event_fingerprint(second))

    def test_report_must_match_catalog_baseline(self):
        issues = json.loads(FIXTURES.read_text())
        report = parse_issue(issues[0])
        errors = validate_report(report, {"alpha": {"content_hash": "b" * 64}})
        self.assertIn("stale baseline_hash", errors)

    def test_no_change_is_not_an_allowed_type(self):
        issues = json.loads(FIXTURES.read_text())
        report = parse_issue(issues[0])
        report["change_type"] = "no_change"
        self.assertIn("unsupported change_type", validate_report(report, {"alpha": {"content_hash": "a" * 64}}))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests and confirm the library is missing**

Run: `.venv/bin/python -m unittest tests.test_feedback_lib -v`

Expected: import failure for `scripts.feedback_lib`.

- [ ] **Step 4: Implement the feedback library**

`scripts/feedback_lib.py` must expose:

```python
ALLOWED_CHANGE_TYPES = {
    "repository_missing",
    "repository_private",
    "repository_redirected",
    "repository_archived",
    "repository_reactivated",
    "release_changed",
    "license_changed",
    "summary_mismatch",
    "deployment_changed",
    "maintenance_changed",
    "other_material_change",
}
PRIORITY = {
    "repository_missing": "urgent",
    "repository_private": "urgent",
    "repository_redirected": "important",
    "license_changed": "important",
    "repository_archived": "important",
    "repository_reactivated": "important",
    "summary_mismatch": "important",
    "release_changed": "normal",
    "deployment_changed": "normal",
    "maintenance_changed": "normal",
    "other_material_change": "normal",
}
```

Expose these exact function signatures: `parse_issue(issue: dict) -> dict`, `validate_report(report: dict, catalog: dict[str, dict]) -> list[str]`, `event_fingerprint(report: dict) -> str`, and `aggregate_reports(reports: list[dict], confirmation_cap: int = 5) -> list[dict]`.

Implementation requirements:

- parse issue-form headings case-insensitively;
- strip Markdown comments and surrounding whitespace;
- reject unknown project IDs, stale baseline hashes, unsupported change types, non-HTTPS evidence, descriptions over 500 characters, and timestamps more than 24 hours in the future;
- compute the fingerprint with the exact newline-joined formula in Task 8;
- keep at most five issue numbers and five confirmations for a duplicate event;
- never preserve or aggregate a `no_change` event;
- order events by `urgent`, `important`, `normal`, then project ID.

- [ ] **Step 5: Run the focused tests and commit**

Run: `.venv/bin/python -m unittest tests.test_feedback_lib -v`

Expected: three tests pass.

```bash
git add tests/fixtures/github_change_issues.json tests/test_feedback_lib.py scripts/feedback_lib.py
git commit -m "feat: validate and deduplicate agent change reports"
```

### Task 10: Import open GitHub reports without storing one file per visitor

**Files:**
- Create: `tests/test_feedback_pipeline.py`
- Create: `scripts/import_github_feedback.py`

- [ ] **Step 1: Write a failing import-state test**

```python
# tests/test_feedback_pipeline.py
import json
import tempfile
import unittest
from pathlib import Path

from scripts.import_github_feedback import import_issue_payload


FIXTURES = Path(__file__).parent / "fixtures/github_change_issues.json"


class FeedbackPipelineTests(unittest.TestCase):
    def test_import_collapses_duplicate_issues_into_events(self):
        issues = json.loads(FIXTURES.read_text())
        catalog = {
            "alpha": {"content_hash": "a" * 64},
            "beta": {"content_hash": "b" * 64},
        }
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "open-events.json"
            result = import_issue_payload(issues, catalog, state)
            self.assertEqual(result["accepted_reports"], 3)
            self.assertEqual(result["unique_events"], 2)
            saved = json.loads(state.read_text())
            self.assertEqual(saved["events"][0]["confirmations"], 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and confirm importer is missing**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: import failure for `scripts.import_github_feedback`.

- [ ] **Step 3: Implement the GitHub importer**

`scripts/import_github_feedback.py` must:

- expose `import_issue_payload(issues, catalog, state_path) -> dict` for tests;
- load canonical records from `dist/v1/nodes/*.json`;
- when `--issues-json` is absent, execute:

```bash
gh issue list --repo Zunzhe966/kai-yuan-da-shu-li --state open --label agent-change-report --limit 1000 --json id,number,title,body,url,createdAt,author
```

- parse and validate every issue;
- write only the aggregated `var/feedback/open-events.json` using an atomic temporary-file rename;
- write invalid report reasons to standard error, not to formal catalog files;
- retain at most five issue numbers, GitHub GraphQL issue node IDs, reporter logins, and confirmations per fingerprint;
- store `imported_at`, `accepted_reports`, `rejected_reports`, and `unique_events` in the state header;
- exit nonzero only if GitHub access fails or the catalog cannot load; malformed individual reports are counted and skipped.

- [ ] **Step 4: Run focused tests and a fixture import**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: the duplicate issues become two unique events.

Run: `.venv/bin/python scripts/import_github_feedback.py --issues-json tests/fixtures/github_change_issues.json --state var/feedback/open-events.json`

Expected: the summary prints `accepted=3 unique=2`, and only one aggregate state file is created.

- [ ] **Step 5: Commit the importer**

```bash
git add tests/test_feedback_pipeline.py scripts/import_github_feedback.py
git commit -m "feat: import compact GitHub feedback state"
```

### Task 11: Generate exactly one non-empty daily review digest

**Files:**
- Modify: `tests/test_feedback_pipeline.py`
- Create: `scripts/build_daily_change_digest.py`

- [ ] **Step 1: Add failing digest tests**

Add two tests:

```python
from scripts.build_daily_change_digest import build_digest

def test_digest_groups_unique_events_and_links_evidence(self):
    # Build a state with one urgent and one normal event.
    # Assert the Markdown has the three priority headings, two event fingerprints,
    # evidence URLs, issue numbers, and no duplicate event row.

def test_no_events_creates_no_empty_digest(self):
    # Pass {"events": []}; assert build_digest returns None and no file exists.
```

Use complete fixture dictionaries copied from `tests/fixtures/github_change_issues.json`; do not mock GitHub or the filesystem.

- [ ] **Step 2: Run the digest tests and confirm the module is missing**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: import failure for `scripts.build_daily_change_digest`.

- [ ] **Step 3: Implement the digest generator**

`scripts/build_daily_change_digest.py` must:

- expose `build_digest(state: dict, output_dir: Path, review_date: str) -> Path | None`;
- return `None` and write no file when `events` is empty;
- write exactly `var/feedback/digests/YYYY-MM-DD.md` for a non-empty state;
- group events under `紧急`, `重要`, and `普通` headings;
- show project ID, change type, observed value, short description, evidence URL, baseline hash, fingerprint, confirmation count, and source issue numbers;
- include a checklist line saying Codex must independently open and verify the evidence;
- include no command that automatically edits project YAML;
- atomically replace an existing digest for the same date instead of creating duplicates.

- [ ] **Step 4: Run tests and create the fixture digest**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: all import and digest tests pass.

Run: `.venv/bin/python scripts/build_daily_change_digest.py --state var/feedback/open-events.json --date 2026-07-17 --output var/feedback/digests`

Expected: one non-empty `2026-07-17.md` file is generated.

- [ ] **Step 5: Commit the daily digest generator**

```bash
git add tests/test_feedback_pipeline.py scripts/build_daily_change_digest.py
git commit -m "feat: build one deduplicated daily change digest"
```

### Task 12: Record verified resolutions and clean temporary reports safely

**Files:**
- Modify: `tests/test_feedback_pipeline.py`
- Create: `scripts/finish_change_event.py`
- Create: `data/verification/.gitkeep`
- Create: `docs/operations/daily-feedback-review.md`

- [ ] **Step 1: Add failing resolution tests**

Add tests that verify:

1. resolving one event removes it from `open-events.json`;
2. the script appends one compact JSON line to `data/verification/YYYY-MM.jsonl` containing fingerprint, project ID, resolution, evidence URL, verified time, verifier, and formal Git commit;
3. a missing or invalid Git commit is rejected;
4. default execution returns proposed `gh` deletion commands but does not execute them;
5. temporary digest files are removed only after every event in that digest is resolved.

- [ ] **Step 2: Run the resolution tests and confirm the module is missing**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: import failure for `scripts.finish_change_event`.

- [ ] **Step 3: Implement explicit, review-gated cleanup**

`scripts/finish_change_event.py` must accept:

```text
--state var/feedback/open-events.json
--fingerprint <64-hex>
--resolution upstream-changed|false-positive|already-fixed
--evidence-url <https-url>
--verified-at <ISO-8601>
--verifier Codex
--formal-commit <git-commit>
--delete-github-issues
```

Behavior:

- verify `git cat-file -e <commit>^{commit}` succeeds;
- refuse `upstream-changed` when `formal-commit` is not an ancestor of `HEAD`;
- append the compact resolution record to `data/verification/YYYY-MM.jsonl`;
- atomically remove the fingerprint from local open state;
- print one `gh api graphql -f query='mutation($issueId:ID!){deleteIssue(input:{issueId:$issueId}){clientMutationId}}' -F issueId=<node-id>` command per stored GraphQL issue node ID in dry-run mode;
- execute deletion only when `--delete-github-issues` is present;
- never delete or edit a node YAML file;
- never delete an unresolved event;
- remove a daily digest only when it contains no remaining fingerprints.

GitHub issue deletion is deliberately explicit because it is irreversible. Codex must first open the upstream evidence, make any required formal catalog edit in a separate commit, and pass that commit hash to this command.

- [ ] **Step 4: Document the fixed daily review sequence**

`docs/operations/daily-feedback-review.md` must instruct Codex to run, once per chosen review time:

```bash
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/import_github_feedback.py
.venv/bin/python scripts/build_daily_change_digest.py
```

For each digest item:

1. open the evidence URL independently;
2. compare it to the current node and baseline hash;
3. classify it as real change, false positive, or already fixed;
4. if real, edit only the affected formal record and run validation/tests;
5. commit the formal data change with the evidence URL in the commit body;
6. run `finish_change_event.py` first without deletion;
7. inspect the proposed issue deletions;
8. rerun with `--delete-github-issues` only after verification;
9. commit the monthly verification JSONL update.

The document must explicitly say that no daily digest is created when nothing materially changed.

- [ ] **Step 5: Run the pipeline tests and commit**

Run: `.venv/bin/python -m unittest tests.test_feedback_pipeline -v`

Expected: import, deduplication, digest, resolution, and cleanup tests all pass.

```bash
git add tests/test_feedback_pipeline.py scripts/finish_change_event.py data/verification/.gitkeep docs/operations/daily-feedback-review.md
git commit -m "feat: review and resolve verified change events"
```

## Final integration and handoff

### Task 13: Run the full local acceptance suite and update discovery docs

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `llms.txt`
- Modify: `docs/DISCOVERY.md`

- [ ] **Step 1: Update all entry points to the new surfaces**

Add these exact concepts consistently:

- `/api/v1/meta.json` is the machine map;
- `/api/v1/catalog.jsonl` is the bulk agent catalog;
- `/api/v1/domains/<domain>.json` is the preferred domain slice;
- `/api/v1/nodes/<id>.json` is the stable per-project baseline;
- an agent opens upstream GitHub only when needed for its own task;
- when upstream matches, the agent submits nothing;
- when a material mismatch exists, the agent may use the `agent-change-report` GitHub issue form;
- passive reports never alter ranking or formal records automatically;
- human advertising and agent sponsorship are absent from Phase One.

- [ ] **Step 2: Run validation, tests, retrieval evaluation, export, build, and release**

Run:

```bash
.venv/bin/python scripts/validate_graph.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/run_retrieval_eval.py
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases --release-name phase-one-acceptance
```

Expected:

- graph validation prints `OK`;
- every unit test passes;
- retrieval evaluation remains at or above 80%;
- the real catalog exports successfully;
- the site builds with no network request during build;
- the release archive and manifest are created.

- [ ] **Step 3: Check size, ad separation, and accidental secret leakage**

Run:

```bash
du -sh dist/v1 build/site build/releases
rg -n 'adsbygoogle|doubleclick|paid_rank|authorization: bearer|ghp_|github_pat_' dist/v1 build/site README.md AGENTS.md llms.txt docs || true
find build/site -type f -size +2M -print
```

Expected:

- `dist/v1` is below 10 MB;
- `build/site` is below 20 MB;
- no real advertising script, paid ranking field, access token, or file over 2 MB is found.

- [ ] **Step 4: Check that unrelated work remains untouched**

Run:

```bash
git diff --name-only main...HEAD | rg '^(graph/edges\.yaml|schema/ontology\.yaml|data/domains/blockchain/|docs/taxonomy-blockchain\.md)$' || true
```

Expected: no output.

- [ ] **Step 5: Commit the discovery updates**

```bash
git add README.md AGENTS.md llms.txt docs/DISCOVERY.md dist/v1
git commit -m "docs: publish phase one atlas discovery protocol"
```

- [ ] **Step 6: Review history and push only after the user approves execution results**

Run:

```bash
git status --short
git log --oneline --decorate -15
git diff --stat main...HEAD
```

Expected: only the planned Phase One files differ, the worktree is clean, and each subsystem has an independent commit. Push the implementation branch only after the user reviews the acceptance summary.

## Phase One acceptance criteria

1. Existing committed catalog records publish deterministically to JSON, JSONL, domain slices, node baselines, static HTML, `llms.txt`, `robots.txt`, and sitemap surfaces.
2. Human pages and machine records derive from the same canonical public record and contain the same objective summary and upstream address.
3. Static search works from a compact prebuilt index without a live Python API, database, or model.
4. A reproducible archive and manifest can be built locally and verified on GitHub without making the website public.
5. The future BandwagonHost origin listens only on loopback port 8088 and cannot replace Xray’s port 443 listener.
6. Cloudflare is designed to absorb reads, while the origin serves immutable static files and retains only three releases.
7. Visiting agents receive no assignments and submit nothing for unchanged projects.
8. Reports contain only a short description of a real catalog/upstream mismatch plus evidence and fingerprints.
9. Duplicate reports collapse into one bounded event; confirmations and stored issue metadata are capped.
10. Exactly one non-empty daily digest is produced for unresolved unique events; no-change days create no report.
11. Codex must independently verify every report before a formal catalog edit.
12. Temporary local state and processed GitHub issues can be cleaned only after a formal Git commit preserves the verified fact, reason, and evidence.
13. No Phase One code connects real human ads or agent sponsorship, and no commercial field can influence objective ranking.
14. Existing Sub2API, CPA, PostgreSQL, Redis, Nginx, Xray/Reality, IPv6 tunnel, health checks, and backups remain untouched.
