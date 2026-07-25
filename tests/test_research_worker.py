import base64
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from scripts import research_worker as worker
from scripts.validate_research_batch import validate_batch


REPO = {
    "id": 1,
    "node_id": "R_kgDOAAAAAA",
    "full_name": "mojombo/grit",
    "html_url": "https://github.com/mojombo/grit",
    "description": "Git repository access from Ruby.",
    "default_branch": "master",
    "visibility": "public",
    "fork": False,
    "parent": None,
    "mirror_url": None,
    "archived": False,
    "disabled": False,
    "created_at": "2007-10-29T14:37:16Z",
    "updated_at": "2026-07-22T00:00:00Z",
    "pushed_at": "2010-05-12T00:00:00Z",
    "license": {"spdx_id": "MIT"},
    "language": "Ruby",
    "topics": ["git"],
}


def fake_github_get(path):
    if path == "/repositories/1":
        return REPO
    if path.endswith("/git/ref/heads/master"):
        return {"object": {"sha": "a" * 40}}
    if path.endswith("/readme"):
        return {
            "html_url": "https://github.com/mojombo/grit/blob/master/README.md",
            "content": base64.b64encode(b"# Grit\nRuby Git library.").decode(),
        }
    if path.endswith("/license"):
        return {
            "html_url": "https://github.com/mojombo/grit/blob/master/LICENSE",
            "license": {"spdx_id": "MIT"},
        }
    if path.endswith("/contents/SECURITY.md?ref=master"):
        raise HTTPError("https://api.github.com", 404, "not found", {}, None)
    if path.endswith("/releases?per_page=5"):
        return []
    raise AssertionError(path)


def fake_enrichment():
    return {
        "name_zh": "Grit",
        "summary_zh": "用于从 Ruby 访问 Git 仓库的库。",
        "summary_en": "A Ruby library for accessing Git repositories.",
        "use_when_zh": ["需要在 Ruby 中读写 Git 仓库时"],
        "use_when_en": ["When a Ruby application needs Git repository access"],
        "avoid_when_zh": ["需求不是 Git 仓库访问时"],
        "avoid_when_en": ["When Git repository access is not needed"],
        "domain_ids": ["devtools"],
        "subdomain_ids": ["devtools:lang-tooling"],
        "task_ids": ["develop"],
        "capability_ids": ["api"],
        "project_types": ["library"],
        "programming_languages": ["Ruby"],
        "frameworks": [],
        "runtimes": ["Ruby"],
        "protocols": [],
        "data_types": [],
        "delivery_modes": ["library"],
        "package_formats": ["gem"],
        "orchestrators": [],
        "operating_systems": [],
        "execution_targets": [],
        "cpu_architectures": [],
        "accelerators": [],
        "zh_ui": "unknown",
        "zh_docs": "unknown",
        "zh_community": "unknown",
        "en_ui": "unknown",
        "en_docs": "full",
        "en_community": "unknown",
        "lifecycle_status": "inactive",
        "maintenance_model": "single-maintainer",
        "maturity": "stable",
        "production_claim": "unknown",
        "known_limitations": ["证据只覆盖公开仓库页面和 README。"],
        "confidence": 0.9,
        "notes": "test evidence",
    }


class ResearchWorkerContractTests(unittest.TestCase):
    def test_deepseek_request_uses_model_secret_but_not_github_token(self):
        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(
                    {"choices": [{"message": {"content": '{"confidence":0.8}'}}]}
                ).encode()

        with patch.dict(
            os.environ,
            {
                "DEEPSEEK_API_KEY": "deepseek-test-key",
                "DEEPSEEK_BASE_URL": "https://api.8j.ink/v1",
                "DEEPSEEK_MODEL": "deepseek-v4-pro",
                "GITHUB_TOKEN": "github-secret-must-not-be-sent",
            },
            clear=True,
        ), patch.object(worker, "urlopen", return_value=Response()) as mocked:
            result = worker._deepseek_json("public repository evidence")

        self.assertEqual(result["confidence"], 0.8)
        request = mocked.call_args.args[0]
        body = request.data.decode("utf-8")
        self.assertIn("public repository evidence", body)
        self.assertNotIn("github-secret-must-not-be-sent", body)
        self.assertEqual(request.headers["Authorization"], "Bearer deepseek-test-key")

    def test_local_execution_is_rejected(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "cloud-only"):
                worker._require_actions_runtime()

    def test_worker_waits_for_exact_boundary_head(self):
        with patch.object(
            worker,
            "_gh_get",
            return_value={
                "workflow_runs": [
                    {
                        "conclusion": "success",
                        "head_sha": "good",
                        "head_branch": "data/research-2026-07-25-accumulation",
                    }
                ]
            },
        ):
            self.assertTrue(
                worker._research_boundary_passed(
                    "data/research-2026-07-25-accumulation", "good"
                )
            )
            self.assertFalse(
                worker._research_boundary_passed(
                    "data/research-2026-07-25-accumulation", "not-checked"
                )
            )

    def test_deepseek_response_is_merged_and_validated(self):
        with patch.object(worker, "_gh_get", side_effect=fake_github_get):
            collected = worker._collect_evidence_v2(REPO)
        dossier = worker._build_dossier_v2(
            collected, "github-since-0-1", "2026-07-25T00:00:00Z"
        )
        worker._merge_deepseek(dossier, fake_enrichment())

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(
                Path(worker.ROOT) / "schema", root / "schema"
            )
            (root / "data/quarantine/research").mkdir(parents=True)
            shutil.copy(
                Path(worker.ROOT) / "data/quarantine/research/worker-config.json",
                root / "data/quarantine/research/worker-config.json",
            )
            artifact = root / "data/quarantine/research/github-since-0-1.jsonl"
            manifest = root / "data/quarantine/research/github-since-0-1.manifest.json"
            artifact.write_text(json.dumps(dossier, ensure_ascii=False) + "\n", encoding="utf-8")
            manifest.write_text(
                json.dumps(
                    {
                        "schema_version": "research-batch-manifest-v1",
                        "batch_id": "github-since-0-1",
                        "created_at": "2026-07-25T00:00:00Z",
                        "input": {
                            "source": "github-public-repositories",
                            "since": "0",
                            "repository_ids": ["1"],
                            "first_repository_id": "1",
                            "last_repository_id": "1",
                        },
                        "counts": {
                            "total": 1,
                            "complete": 0,
                            "unknown": 1,
                            "conflicting": 0,
                            "failed": 0,
                            "skipped": 0,
                        },
                        "artifact": {
                            "path": "data/quarantine/research/github-since-0-1.jsonl",
                            "bytes": artifact.stat().st_size,
                            "sha256": worker._sha256_text(artifact.read_text()),
                        },
                        "rate_limit": {
                            "resource": "core",
                            "limit": 5000,
                            "remaining": 4999,
                            "reset_at": "2026-07-25T01:00:00Z",
                            "observed_at": "2026-07-25T00:00:00Z",
                        },
                        "next_since": "1",
                        "failures": [],
                        "worker": {
                            "model_role": "deepseek-data-worker",
                            "program_version": worker.WORKER_VERSION,
                            "run_id": "test-run",
                        },
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            errors = validate_batch(
                artifact,
                manifest,
                repo_root=root,
                available_repositories=1,
            )
        self.assertEqual(errors, [])
        self.assertEqual(dossier["classification"]["domain_ids"], ["devtools"])
        self.assertEqual(dossier["record_status"], "unknown")


if __name__ == "__main__":
    unittest.main()
