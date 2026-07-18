import tempfile
import unittest
from pathlib import Path

from scripts.build_static_site import build_site


class BuildStaticSiteTests(unittest.TestCase):
    def test_site_has_faceted_human_and_agent_surfaces_without_ad_code(self):
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
            self.assertIn("Sitemap: https://atlas.example/sitemap.xml", robots)
            self.assertIn('/favicon.svg', home)
            self.assertTrue((output / "favicon.svg").exists())
            self.assertTrue((output / "api/v1/nodes/alpha.json").exists())
            self.assertTrue((output / "api/v1/search-index.json.gz").exists())
            self.assertNotIn("adsbygoogle", home)
            self.assertNotIn(
                "sponsored_results",
                (output / "api/v1/nodes/alpha.json").read_text(),
            )

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


if __name__ == "__main__":
    unittest.main()
