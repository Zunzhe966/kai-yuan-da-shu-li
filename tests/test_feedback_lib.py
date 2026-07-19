import json
import unittest
from pathlib import Path

from scripts.feedback_lib import aggregate_reports, event_fingerprint, parse_issue, validate_report


FIXTURES = Path(__file__).parent / "fixtures/github_change_issues.json"


class FeedbackLibTests(unittest.TestCase):
    def test_duplicate_wording_has_same_event_fingerprint(self):
        issues = json.loads(FIXTURES.read_text())
        first = parse_issue(issues[0])
        second = parse_issue(issues[1])
        self.assertEqual(event_fingerprint(first), event_fingerprint(second))

    def test_report_must_match_catalog_baseline(self):
        report = parse_issue(json.loads(FIXTURES.read_text())[0])
        errors = validate_report(report, {"alpha": {"content_hash": "b" * 64}})
        self.assertIn("stale baseline_hash", errors)

    def test_no_change_is_not_an_allowed_type(self):
        report = parse_issue(json.loads(FIXTURES.read_text())[0])
        report["change_type"] = "no_change"
        errors = validate_report(report, {"alpha": {"content_hash": "a" * 64}})
        self.assertIn("unsupported change_type", errors)

    def test_duplicate_reports_are_capped_and_prioritized(self):
        reports = [parse_issue(issue) for issue in json.loads(FIXTURES.read_text())]
        events = aggregate_reports(reports, confirmation_cap=1)
        self.assertEqual([event["priority"] for event in events], ["urgent", "important"])
        self.assertEqual(events[0]["confirmations"], 1)
        self.assertEqual(events[0]["issue_numbers"], [101])


if __name__ == "__main__":
    unittest.main()
