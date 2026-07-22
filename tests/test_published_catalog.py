import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.published_catalog import (
    build_public_record,
    stable_catalog_hash,
    stable_content_hash,
    stable_generated_at,
)


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
    def test_generated_at_prefers_source_date_epoch(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"SOURCE_DATE_EPOCH": "0"}):
                self.assertEqual(
                    stable_generated_at(repo_root=Path(directory)),
                    "1970-01-01T00:00:00Z",
                )

    def test_generated_at_uses_head_commit_instead_of_path_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=root, check=True)
            subprocess.run(
                ["git", "config", "user.email", "test@example.invalid"], cwd=root, check=True
            )
            (root / "data").mkdir()
            (root / "data/catalog.txt").write_text("catalog\n")
            subprocess.run(["git", "add", "data/catalog.txt"], cwd=root, check=True)
            first_env = dict(
                os.environ,
                GIT_AUTHOR_DATE="2001-09-09T01:46:40Z",
                GIT_COMMITTER_DATE="2001-09-09T01:46:40Z",
            )
            subprocess.run(["git", "commit", "-qm", "catalog"], cwd=root, check=True, env=first_env)
            (root / "README.md").write_text("release metadata\n")
            subprocess.run(["git", "add", "README.md"], cwd=root, check=True)
            head_env = dict(
                os.environ,
                GIT_AUTHOR_DATE="2001-09-09T02:46:40Z",
                GIT_COMMITTER_DATE="2001-09-09T02:46:40Z",
            )
            subprocess.run(["git", "commit", "-qm", "release"], cwd=root, check=True, env=head_env)

            with patch.dict(os.environ, {}, clear=True):
                self.assertEqual(
                    stable_generated_at(repo_root=root),
                    "2001-09-09T02:46:40Z",
                )

    def test_generated_at_fails_without_environment_or_git(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(RuntimeError, "SOURCE_DATE_EPOCH"):
                    stable_generated_at(repo_root=Path(directory))

    def test_hash_ignores_input_dictionary_order(self):
        reordered = dict(reversed(list(SAMPLE.items())))
        self.assertEqual(stable_content_hash(SAMPLE), stable_content_hash(reordered))

    def test_public_record_contains_filter_and_verification_fields(self):
        record = build_public_record("example-tool", SAMPLE)
        self.assertEqual(record["id"], "example-tool")
        self.assertEqual(record["tags"], ["cli", "search"])
        self.assertEqual(record["verification_status"], "unverified")
        self.assertRegex(record["content_hash"], r"^[0-9a-f]{64}$")
        self.assertNotIn("tag_list", record)

    def test_hash_changes_when_visible_summary_changes(self):
        changed = dict(SAMPLE, summary="A changed description.")
        self.assertNotEqual(stable_content_hash(SAMPLE), stable_content_hash(changed))

    def test_catalog_hash_ignores_node_and_edge_order(self):
        records = [build_public_record("example-tool", SAMPLE)]
        edges = [
            {"from": "a", "to": "b", "type": "alternative_to"},
            {"from": "a", "to": "c", "type": "integrates_with"},
        ]
        self.assertEqual(
            stable_catalog_hash(records, edges),
            stable_catalog_hash(list(reversed(records)), list(reversed(edges))),
        )

    def test_catalog_hash_changes_with_visible_content(self):
        first = [build_public_record("example-tool", SAMPLE)]
        second = [build_public_record("example-tool", dict(SAMPLE, summary="Changed"))]
        self.assertNotEqual(stable_catalog_hash(first, []), stable_catalog_hash(second, []))


if __name__ == "__main__":
    unittest.main()
