import tempfile
import unittest
from pathlib import Path

from scripts.repository_sources import load_sources, validate_sources


class RepositoryTopologyTests(unittest.TestCase):
    def test_current_manifest_has_one_public_pinned_source(self):
        sources = load_sources(Path("data/sources.yaml"))
        self.assertEqual([source["name"] for source in sources], ["atlas-main"])
        self.assertEqual(sources[0]["visibility"], "public")
        self.assertRegex(sources[0]["revision"], r"^[0-9a-f]{40}$")
        self.assertEqual(validate_sources(sources), [])

    def test_private_source_is_rejected_from_public_build(self):
        errors = validate_sources([
            {
                "name": "private-projects",
                "url": "https://github.com/example/private",
                "visibility": "private",
                "revision": "a" * 40,
                "content_path": "data",
            }
        ])
        self.assertIn("private visibility is not allowed", errors[0])

    def test_duplicate_name_and_unpinned_source_are_rejected(self):
        source = {
            "name": "same",
            "url": "https://github.com/example/one",
            "visibility": "public",
            "revision": "",
            "content_path": "data",
        }
        errors = validate_sources([source, dict(source, url="https://github.com/example/two")])
        self.assertTrue(any("duplicate source name" in error for error in errors))
        self.assertTrue(any("revision must be a 40-character commit SHA" in error for error in errors))

    def test_non_https_source_is_rejected(self):
        errors = validate_sources([
            {
                "name": "insecure-source",
                "url": "http://github.com/example/insecure",
                "visibility": "public",
                "revision": "a" * 40,
                "content_path": "data",
            }
        ])
        self.assertTrue(any("url must be HTTPS" in error for error in errors))

    def test_missing_content_path_is_rejected(self):
        errors = validate_sources([
            {
                "name": "missing-content-path",
                "url": "https://github.com/example/missing-content-path",
                "visibility": "public",
                "revision": "a" * 40,
            }
        ])
        self.assertTrue(any("missing fields: content_path" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
