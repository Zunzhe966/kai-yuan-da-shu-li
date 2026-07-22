import json
import tempfile
import unittest
from pathlib import Path

from scripts.atlas_lib import load_edges, load_nodes
from scripts.export_atlas_json import export_atlas_index


class ExportAtlasJsonTests(unittest.TestCase):
    def test_export_uses_explicit_stable_timestamp(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "atlas.json"
            export_atlas_index(
                output,
                {"alpha": {"domain": "devtools", "name": "Alpha", "tag_list": []}},
                [],
                generated_at="2026-07-22T00:00:00Z",
            )
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(payload["generated_at"], "2026-07-22T00:00:00Z")
            self.assertEqual(payload["node_count"], 1)

    def test_tracked_atlas_snapshot_matches_current_graph(self):
        tracked = Path("dist/atlas-index.json")
        tracked_payload = json.loads(tracked.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as directory:
            rebuilt = Path(directory) / "atlas.json"
            export_atlas_index(
                rebuilt,
                load_nodes(None),
                load_edges(),
                generated_at=tracked_payload["generated_at"],
            )
            self.assertEqual(
                json.loads(tracked.read_text(encoding="utf-8")),
                json.loads(rebuilt.read_text(encoding="utf-8")),
            )


if __name__ == "__main__":
    unittest.main()
