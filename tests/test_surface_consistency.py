import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class SurfaceConsistencyTests(unittest.TestCase):
    def test_machine_and_human_pages_share_summary_and_bidirectional_relations(self):
        nodes = {
            "alpha": {
                "domain": "devtools",
                "name": "Alpha",
                "repo": "https://github.com/a/a",
                "summary": "Same canonical summary",
                "tag_list": ["cli"],
                "status": "active",
            },
            "beta": {
                "domain": "devtools",
                "name": "Beta",
                "repo": "https://github.com/b/b",
                "summary": "Alternative project",
                "tag_list": ["cli"],
                "status": "active",
            },
        }
        edges = [{"from": "alpha", "to": "beta", "type": "alternative_to"}]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build_site(output, nodes, edges, "https://atlas.example")
            record = json.loads((output / "api/v1/nodes/alpha.json").read_text())
            alpha = (output / "projects/alpha/index.html").read_text()
            beta = (output / "projects/beta/index.html").read_text()
            self.assertIn(record["summary"], alpha)
            self.assertIn("Beta", alpha)
            self.assertIn("Alpha", beta)
            self.assertNotIn("paid_rank", json.dumps(record))
            self.assertNotIn("sponsored", json.dumps(record).lower())


if __name__ == "__main__":
    unittest.main()
