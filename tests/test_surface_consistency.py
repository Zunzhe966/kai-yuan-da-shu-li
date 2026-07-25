import json
import tempfile
import unittest
from pathlib import Path

import yaml

from scripts.build_static_site import build_site


class SurfaceConsistencyTests(unittest.TestCase):
    def test_standard_verify_does_not_execute_research_pr_content(self):
        verify_text = Path(".github/workflows/verify.yml").read_text(encoding="utf-8")
        gate_text = Path(".github/workflows/pr-gate.yml").read_text(encoding="utf-8")
        self.assertNotIn("pull_request:", verify_text)
        self.assertIn("pull_request_target:", gate_text)
        self.assertIn("diff --name-only -z --no-renames", gate_text)
        self.assertNotIn("/files?", gate_text)
        workflow = yaml.safe_load(gate_text)
        steps = workflow["jobs"]["test-and-build"]["steps"]
        classifier = next(
            step for step in steps if step.get("name") == "Detect research batch changes"
        )
        self.assertEqual(classifier["id"], "research")
        self.assertIn("data/quarantine/research/", classifier["run"])
        for step in steps[steps.index(classifier) + 1 :]:
            if step.get("name") == "Delegate research validation":
                self.assertEqual(step.get("if"), "steps.research.outputs.changed == 'true'")
                continue
            self.assertEqual(
                step.get("if"),
                "steps.research.outputs.changed != 'true'",
                step,
            )

    def test_main_verify_checks_out_complete_git_history(self):
        workflow = yaml.safe_load(
            Path(".github/workflows/verify.yml").read_text(encoding="utf-8")
        )
        checkout = workflow["jobs"]["test-and-build"]["steps"][0]
        self.assertEqual(checkout["uses"], "actions/checkout@v4")
        self.assertEqual(checkout["with"]["fetch-depth"], 0)

    def test_deepseek_contract_uses_continuous_accumulation_and_periodic_review(self):
        paths = (
            Path("docs/operations/goal-mode-bootstrap.md"),
            Path("docs/operations/deepseek-data-worker.md"),
            Path("docs/operations/reviewer-publisher-runbook.md"),
            Path("docs/operations/long-running-goal-mode.md"),
        )
        combined = "\n".join(path.read_text(encoding="utf-8") for path in paths)
        self.assertIn('approval_policy = "on-request"', combined)
        self.assertIn("不得主动发起批准请求", combined)
        self.assertIn("持续积累 PR", combined)
        self.assertIn("冻结提交 SHA", combined)
        self.assertIn("集中审核", combined)
        self.assertIn("停止继续推送", combined)
        self.assertNotIn('approval_policy = "never"', combined)
        self.assertNotIn("使用 approval_policy=never", combined)
        self.assertNotIn("一次只允许一个待审数据 PR", combined)
        self.assertNotIn("上一批进入 main 后", combined)

    def test_manifest_schema_matches_operational_checkpoint_contract(self):
        schema = json.loads(
            Path("schema/research-batch-manifest-v1.schema.json").read_text(
                encoding="utf-8"
            )
        )
        worker = Path("docs/operations/deepseek-data-worker.md").read_text(
            encoding="utf-8"
        )
        bootstrap = Path("docs/operations/goal-mode-bootstrap.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("rate_limit", schema["required"])
        self.assertIn("skipped", schema["$defs"]["counts"]["required"])
        self.assertIn("attempts", schema["$defs"]["failure"]["required"])
        self.assertIn("program_version", schema["$defs"]["worker"]["required"])
        for field in ("program_version", "skipped", "rate_limit", "attempts"):
            self.assertIn(field, worker)
            self.assertIn(field, bootstrap)
        self.assertIn("artifact.path/bytes/sha256", worker)

    def test_unreviewed_research_never_publishes_to_the_website(self):
        worker = Path("docs/operations/deepseek-data-worker.md").read_text(encoding="utf-8")
        reviewer = Path("docs/operations/reviewer-publisher-runbook.md").read_text(encoding="utf-8")
        self.assertIn("未审核数据不得进入正式图谱或网站", worker)
        self.assertIn("未审核数据不得进入正式图谱或网站", reviewer)

    def test_cloudflare_build_uses_the_stable_production_url(self):
        for path in (
            Path("docs/operations/cloudflare-pages-connection.md"),
            Path("docs/operations/static-release.md"),
        ):
            text = path.read_text(encoding="utf-8")
            self.assertIn("https://kai-yuan-da-shu-li.pages.dev", text)
            self.assertNotIn("$CF_PAGES_URL", text)

    def test_pages_deploy_waits_for_verified_main_and_uses_a_supported_probe_identity(self):
        verify = Path(".github/workflows/verify.yml").read_text(encoding="utf-8")
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
        self.assertIn("--branch main", workflow)
        self.assertIn("--source-revision", verify)
        self.assertIn("--source-revision", workflow)
        self.assertIn('"catalog_hash"', workflow)
        self.assertIn('"source_revision"', workflow)

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
