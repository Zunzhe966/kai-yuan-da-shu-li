import json
import tarfile
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
            manifest = json.loads((root / "one/test-release.manifest.json").read_text())
            self.assertEqual(manifest, first)
            with tarfile.open(root / "one/test-release.tar.gz", "r:gz") as archive:
                self.assertEqual(archive.getnames(), ["index.html"])

    def test_release_rejects_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site = root / "site"
            site.mkdir()
            (site / "outside.txt").symlink_to(root / "outside.txt")
            with self.assertRaisesRegex(ValueError, "symlink"):
                build_release(site, root / "releases", "unsafe")


if __name__ == "__main__":
    unittest.main()
