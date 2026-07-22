import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class SurfaceConsistencyTests(unittest.TestCase):
    def test_cloudflare_build_uses_the_stable_production_url(self):
        for path in (
            Path("docs/operations/cloudflare-pages-connection.md"),
            Path("docs/operations/static-release.md"),
        ):
            text = path.read_text(encoding="utf-8")
            self.assertIn("https://kai-yuan-da-shu-li.pages.dev", text)
            self.assertNotIn("$CF_PAGES_URL", text)

    def test_pages_deploy_waits_for_verified_main_and_uses_a_supported_probe_identity(self):
        workflow = Path(".github/workflows/pages-deploy.yml").read_text(encoding="utf-8")
        self.assertIn("workflow_run:", workflow)
        self.assertIn('workflows: ["verify"]', workflow)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", workflow)
        self.assertIn("github.event.workflow_run.head_sha", workflow)
        self.assertIn("GitHub-Actions/1.0 (+https://github.com/actions)", workflow)
        self.assertNotIn("urllib.request", workflow)
        self.assertIn("id: commit", workflow)
        self.assertIn("deploy_current=true", workflow)
        self.assertIn("steps.commit.outputs.deploy_current == 'true'", workflow)

    def test_phase_one_documents_ad_surfaces_without_enabling_them(self):
        advertising_path = Path("docs/advertising.md")
        self.assertTrue(advertising_path.exists())
        advertising = advertising_path.read_text(encoding="utf-8")
        readme = Path("README.md").read_text(encoding="utf-8")
        self.assertIn("真人页面广告", advertising)
        self.assertIn("sponsored_results", advertising)
        for field in ("advertiser", "campaign_id", "starts_at", "ends_at", "landing_url"):
            self.assertIn(field, advertising)
        self.assertIn("docs/advertising.md", readme)

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
            all_machine_data = "\n".join(
                path.read_text(encoding="utf-8", errors="ignore")
                for path in (output / "api/v1").rglob("*")
                if path.is_file() and path.suffix != ".gz"
            )
            all_human_html = "\n".join(
                path.read_text(encoding="utf-8", errors="ignore")
                for path in output.rglob("*.html")
            )
            self.assertNotIn("sponsored_results", all_machine_data)
            self.assertNotIn("paid_rank", all_machine_data)
            self.assertNotIn("adsbygoogle", all_human_html)
            self.assertNotIn("doubleclick", all_human_html)


if __name__ == "__main__":
    unittest.main()
