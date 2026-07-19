import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts.build_daily_change_digest import build_digest
from scripts.finish_change_event import finish_event
from scripts.import_github_feedback import import_issue_payload


FIXTURES = Path(__file__).parent / "fixtures/github_change_issues.json"


class FeedbackPipelineTests(unittest.TestCase):
    def test_import_collapses_duplicate_issues_into_events(self):
        issues = json.loads(FIXTURES.read_text())
        catalog = {
            "alpha": {"content_hash": "a" * 64},
            "beta": {"content_hash": "b" * 64},
        }
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "open-events.json"
            result = import_issue_payload(issues, catalog, state)
            self.assertEqual(result["accepted_reports"], 3)
            self.assertEqual(result["unique_events"], 2)
            saved = json.loads(state.read_text())
            self.assertEqual(saved["events"][0]["confirmations"], 2)
            self.assertEqual(list(state.parent.glob("*.tmp")), [])

    def test_digest_groups_unique_events_and_links_evidence(self):
        issues = json.loads(FIXTURES.read_text())
        catalog = {
            "alpha": {"content_hash": "a" * 64},
            "beta": {"content_hash": "b" * 64},
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = import_issue_payload(issues, catalog, root / "open-events.json")
            digest = build_digest(state, root / "digests", "2026-07-18")
            self.assertIsNotNone(digest)
            text = digest.read_text()
            self.assertIn("## 紧急", text)
            self.assertIn("## 重要", text)
            self.assertIn("## 普通", text)
            self.assertIn("https://github.com/a/a", text)
            self.assertIn("#101, #102", text)
            for event in state["events"]:
                self.assertEqual(text.count(event["fingerprint"]), 1)

    def test_no_events_creates_no_empty_digest(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "digests"
            result = build_digest({"events": []}, output, "2026-07-18")
            self.assertIsNone(result)
            self.assertFalse(output.exists())

    def test_finish_event_preview_does_not_change_local_state(self):
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True
        ).stdout.strip()
        fingerprint = "f" * 64
        state = {
            "events": [
                {
                    "fingerprint": fingerprint,
                    "project_id": "alpha",
                    "evidence_url": "https://github.com/a/a",
                    "issue_node_ids": ["I_kwDOExample101"],
                }
            ]
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state_path = root / "open-events.json"
            state_path.write_text(json.dumps(state))
            digest_dir = root / "digests"
            digest_dir.mkdir()
            digest = digest_dir / "2026-07-18.md"
            digest.write_text(f"event `{fingerprint}`\n")
            commands = finish_event(
                state_path=state_path,
                fingerprint=fingerprint,
                resolution="false-positive",
                evidence_url="https://github.com/a/a",
                verified_at="2026-07-18T10:00:00Z",
                verifier="Codex",
                formal_commit=commit,
                verification_dir=root / "verification",
                digest_dir=digest_dir,
            )
            self.assertEqual(json.loads(state_path.read_text()), state)
            self.assertFalse((root / "verification").exists())
            self.assertIn("I_kwDOExample101", commands[0])
            self.assertTrue(digest.exists())

    def test_finish_event_records_and_cleans_only_after_issue_deletion_succeeds(self):
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True
        ).stdout.strip()
        fingerprint = "f" * 64
        state = {
            "events": [
                {
                    "fingerprint": fingerprint,
                    "project_id": "alpha",
                    "evidence_url": "https://github.com/a/a",
                    "issue_node_ids": ["I_kwDOExample101"],
                }
            ]
        }
        deleted = []
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state_path = root / "open-events.json"
            state_path.write_text(json.dumps(state))
            digest_dir = root / "digests"
            digest_dir.mkdir()
            digest = digest_dir / "2026-07-18.md"
            digest.write_text(f"event `{fingerprint}`\n")

            finish_event(
                state_path=state_path,
                fingerprint=fingerprint,
                resolution="false-positive",
                evidence_url="https://github.com/a/a",
                verified_at="2026-07-18T10:00:00Z",
                verifier="Codex",
                formal_commit=commit,
                verification_dir=root / "verification",
                digest_dir=digest_dir,
                delete_github_issues=True,
                issue_deleter=deleted.append,
            )

            self.assertEqual(deleted, ["I_kwDOExample101"])
            self.assertEqual(json.loads(state_path.read_text())["events"], [])
            record = json.loads((root / "verification/2026-07.jsonl").read_text())
            self.assertEqual(record["formal_commit"], commit)
            self.assertFalse(digest.exists())

    def test_finish_event_keeps_remaining_issue_ids_when_deletion_fails(self):
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True
        ).stdout.strip()
        fingerprint = "f" * 64
        state = {
            "events": [
                {
                    "fingerprint": fingerprint,
                    "project_id": "alpha",
                    "evidence_url": "https://github.com/a/a",
                    "issue_node_ids": ["I_kwDOExample101", "I_kwDOExample102"],
                }
            ]
        }

        def fail_on_second_issue(node_id):
            if node_id == "I_kwDOExample102":
                raise subprocess.CalledProcessError(1, ["gh", "api"])

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state_path = root / "open-events.json"
            state_path.write_text(json.dumps(state))
            digest_dir = root / "digests"
            digest_dir.mkdir()
            digest = digest_dir / "2026-07-18.md"
            digest.write_text(f"event `{fingerprint}`\n")

            with self.assertRaises(subprocess.CalledProcessError):
                finish_event(
                    state_path=state_path,
                    fingerprint=fingerprint,
                    resolution="false-positive",
                    evidence_url="https://github.com/a/a",
                    verified_at="2026-07-18T10:00:00Z",
                    verifier="Codex",
                    formal_commit=commit,
                    verification_dir=root / "verification",
                    digest_dir=digest_dir,
                    delete_github_issues=True,
                    issue_deleter=fail_on_second_issue,
                )

            saved_event = json.loads(state_path.read_text())["events"][0]
            self.assertEqual(saved_event["issue_node_ids"], ["I_kwDOExample102"])
            self.assertFalse((root / "verification").exists())
            self.assertTrue(digest.exists())

    def test_finish_event_rejects_unknown_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "open-events.json"
            state.write_text(json.dumps({"events": []}))
            with self.assertRaisesRegex(ValueError, "formal commit"):
                finish_event(
                    state_path=state,
                    fingerprint="f" * 64,
                    resolution="already-fixed",
                    evidence_url="https://github.com/a/a",
                    verified_at="2026-07-18T10:00:00Z",
                    verifier="Codex",
                    formal_commit="not-a-commit",
                    verification_dir=root / "verification",
                    digest_dir=root / "digests",
                )


if __name__ == "__main__":
    unittest.main()
