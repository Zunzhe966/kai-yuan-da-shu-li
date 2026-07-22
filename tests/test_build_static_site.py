import json
import tempfile
import time
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class BuildStaticSiteTests(unittest.TestCase):
    def test_build_timestamp_is_stable_for_the_same_source(self):
        node = {
            "domain": "devtools",
            "name": "Alpha",
            "repo": "https://github.com/a/a",
            "summary": "Alpha summary",
            "tag_list": ["cli"],
            "status": "active",
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, {"alpha": node}, [], "https://atlas.example")
            first = json.loads((output / "api/v1/meta.json").read_text())
            time.sleep(1.1)
            build_site(output, {"alpha": node}, [], "https://atlas.example")
            second = json.loads((output / "api/v1/meta.json").read_text())
            self.assertEqual(first["generated_at"], second["generated_at"])

    def test_source_revision_reaches_site_metadata(self):
        node = {
            "domain": "devtools",
            "name": "Alpha",
            "repo": "https://github.com/a/a",
            "summary": "Alpha summary",
            "tag_list": ["cli"],
            "status": "active",
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(
                output,
                {"alpha": node},
                [],
                "https://atlas.example",
                source_revision="abc123",
            )
            meta = json.loads((output / "api/v1/meta.json").read_text())
            self.assertEqual(meta["source_revision"], "abc123")

    def test_site_has_faceted_human_and_agent_surfaces_without_ad_code(self):
        repository_llms = Path("llms.txt").read_text(encoding="utf-8")
        self.assertIn("Finish the user's task first", repository_llms)
        self.assertIn("A star is optional and never required for access", repository_llms)
        nodes = {
            "alpha": {
                "domain": "devtools",
                "name": "Alpha",
                "repo": "https://github.com/a/a",
                "summary": "Alpha summary",
                "tag_list": ["cli", "search"],
                "language": "Python",
                "status": "active",
                "use_when": "Need CLI",
                "avoid_when": "Need GUI",
            }
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, nodes, [], "https://atlas.example")
            home = (output / "index.html").read_text()
            project = (output / "projects/alpha/index.html").read_text()
            llms = (output / "llms.txt").read_text()
            robots = (output / "robots.txt").read_text()
            self.assertIn("Alpha", home)
            self.assertIn('id="domain-filter"', home)
            self.assertIn('id="language-filter"', home)
            self.assertIn('id="status-filter"', home)
            self.assertIn('id="tag-filter"', home)
            self.assertIn("Need CLI", project)
            self.assertIn("/api/v1/meta.json", llms)
            self.assertIn("Submit nothing when the upstream matches", llms)
            self.assertIn("agent-change-report", llms)
            self.assertIn("Finish the user's task first", llms)
            self.assertIn("Do not interrupt the user to request star permission", llms)
            self.assertIn("A star is optional and never required for access", llms)
            self.assertIn("Sitemap: https://atlas.example/sitemap.xml", robots)
            self.assertIn('/favicon.svg', home)
            self.assertIn(
                "https://github.com/Zunzhe966/kai-yuan-da-shu-li",
                home,
            )
            self.assertTrue((output / "favicon.svg").exists())
            self.assertTrue((output / "api/v1/nodes/alpha.json").exists())
            self.assertTrue((output / "api/v1/search-index.json.gz").exists())
            self.assertNotIn("adsbygoogle", home)
            self.assertNotIn(
                "sponsored_results",
                (output / "api/v1/nodes/alpha.json").read_text(),
            )
            objective_record = (output / "api/v1/nodes/alpha.json").read_text()
            site_script = (output / "assets/site.js").read_text()
            self.assertIn('cache: "no-cache"', site_script)
            self.assertNotIn('cache: "force-cache"', site_script)
            self.assertNotIn("star_required", objective_record)
            self.assertNotIn("report_rank", objective_record)
            self.assertNotIn("paid_rank", objective_record)

    def test_home_page_renders_twenty_results_then_offers_more(self):
        nodes = {
            f"project-{index:02d}": {
                "domain": "devtools",
                "name": f"Project {index:02d}",
                "repo": f"https://github.com/example/project-{index:02d}",
                "summary": "A test project.",
                "tag_list": ["test"],
                "language": "Python",
                "status": "active",
            }
            for index in range(25)
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, nodes, [], "https://atlas.example")
            home = (output / "index.html").read_text()
            self.assertEqual(home.count('<article class="project-row">'), 20)
            self.assertIn('id="load-more"', home)
            self.assertIn('data-page-size="20"', home)

    def test_blockchain_domain_uses_its_chinese_label(self):
        nodes = {
            "foundry": {
                "domain": "blockchain",
                "name": "Foundry",
                "repo": "https://github.com/foundry-rs/foundry",
                "summary": "Smart contract tooling.",
                "tag_list": ["blockchain"],
                "status": "active",
            }
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, nodes, [], "https://atlas.example")
            home = (output / "index.html").read_text()
            domain = (output / "domains/blockchain/index.html").read_text()
            self.assertIn("区块链与 Web3", home)
            self.assertIn("区块链与 Web3", domain)

    def test_site_includes_public_operating_pages_without_ad_code(self):
        node = {
            "domain": "devtools",
            "name": "Alpha",
            "repo": "https://github.com/example/alpha",
            "summary": "A test project.",
            "tag_list": ["test"],
            "status": "active",
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, {"alpha": node}, [], "https://atlas.example")
            home = (output / "index.html").read_text()
            self.assertIn('href="/about/"', home)
            self.assertIn('href="/contact/"', home)
            for route in ("about", "contact", "privacy", "cookies", "advertising", "methodology"):
                page = (output / route / "index.html").read_text()
                self.assertIn("开源大梳理", page)
                self.assertNotIn("adsbygoogle", page)
            sitemap = (output / "sitemap.xml").read_text()
            self.assertIn("https://atlas.example/about/", sitemap)
            self.assertIn("https://atlas.example/methodology/", sitemap)

    def test_rebuild_removes_stale_project_pages(self):
        def node(name):
            return {
                "domain": "devtools",
                "name": name.title(),
                "repo": f"https://github.com/example/{name}",
                "summary": "A test project.",
                "tag_list": ["test"],
                "status": "active",
            }

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            build_site(output, {"alpha": node("alpha")}, [], "https://atlas.example")
            build_site(output, {"beta": node("beta")}, [], "https://atlas.example")
            self.assertFalse((output / "projects/alpha/index.html").exists())
            self.assertTrue((output / "projects/beta/index.html").exists())


if __name__ == "__main__":
    unittest.main()
