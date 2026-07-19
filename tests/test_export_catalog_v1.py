import json
import tempfile
import unittest
from pathlib import Path

from scripts.export_catalog_v1 import export_catalog


class ExportCatalogV1Tests(unittest.TestCase):
    def test_export_writes_versioned_machine_and_category_surfaces(self):
        nodes = {
            "alpha": {
                "domain": "devtools",
                "name": "Alpha",
                "repo": "https://github.com/a/a",
                "summary": "Alpha summary",
                "tag_list": ["cli"],
                "language": "Python",
                "status": "active",
            },
            "beta": {
                "domain": "backend",
                "name": "Beta",
                "repo": "https://github.com/b/b",
                "summary": "Beta summary",
                "tag_list": ["api"],
                "language": "Go",
                "status": "archived",
            },
        }
        edges = [{"source": "alpha", "target": "beta", "type": "alternative_to"}]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            export_catalog(root, nodes, edges, generated_at="2026-07-18T00:00:00Z")
            meta = json.loads((root / "meta.json").read_text())
            self.assertEqual(meta["node_count"], 2)
            self.assertEqual(meta["edge_count"], 1)
            self.assertEqual(meta["facets"]["languages"], ["Go", "Python"])
            self.assertTrue((root / "catalog.jsonl").exists())
            self.assertTrue((root / "domains/devtools.json").exists())
            self.assertTrue((root / "nodes/alpha.json").exists())
            search = json.loads((root / "search-index.json").read_text())
            self.assertEqual([item["id"] for item in search], ["alpha", "beta"])
            self.assertEqual(search[0]["language"], "Python")

    def test_export_removes_records_that_are_no_longer_in_source(self):
        def node(domain, name):
            return {
                "domain": domain,
                "name": name.title(),
                "repo": f"https://github.com/example/{name}",
                "summary": "A test project.",
                "tag_list": ["test"],
                "status": "active",
            }

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "v1"
            export_catalog(
                output,
                {"alpha": node("devtools", "alpha")},
                [],
                generated_at="2026-07-17T00:00:00Z",
            )
            export_catalog(
                output,
                {"beta": node("backend", "beta")},
                [],
                generated_at="2026-07-18T00:00:00Z",
            )
            self.assertFalse((output / "nodes/alpha.json").exists())
            self.assertFalse((output / "domains/devtools.json").exists())
            self.assertTrue((output / "nodes/beta.json").exists())


if __name__ == "__main__":
    unittest.main()
