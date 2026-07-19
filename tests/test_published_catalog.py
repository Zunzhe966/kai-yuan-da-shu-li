import unittest

from scripts.published_catalog import build_public_record, stable_content_hash


SAMPLE = {
    "id": "example-tool",
    "domain": "devtools",
    "name": "Example Tool",
    "repo": "https://github.com/example/tool",
    "summary": "A useful tool.",
    "tag_list": ["cli", "search"],
    "language": "Python",
    "license": "MIT",
    "status": "active",
    "use_when": "Need a small CLI.",
    "avoid_when": "Need a hosted service.",
    "niche": "small CLI",
}


class PublishedCatalogTests(unittest.TestCase):
    def test_hash_ignores_input_dictionary_order(self):
        reordered = dict(reversed(list(SAMPLE.items())))
        self.assertEqual(stable_content_hash(SAMPLE), stable_content_hash(reordered))

    def test_public_record_contains_filter_and_verification_fields(self):
        record = build_public_record("example-tool", SAMPLE)
        self.assertEqual(record["id"], "example-tool")
        self.assertEqual(record["tags"], ["cli", "search"])
        self.assertEqual(record["verification_status"], "unverified")
        self.assertRegex(record["content_hash"], r"^[0-9a-f]{64}$")
        self.assertNotIn("tag_list", record)

    def test_hash_changes_when_visible_summary_changes(self):
        changed = dict(SAMPLE, summary="A changed description.")
        self.assertNotEqual(stable_content_hash(SAMPLE), stable_content_hash(changed))


if __name__ == "__main__":
    unittest.main()
