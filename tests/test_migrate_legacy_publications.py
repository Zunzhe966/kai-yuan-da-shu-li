from __future__ import annotations

import json
from pathlib import Path

import yaml

from scripts.migrate_legacy_publications import (
    SECTION_KEYS,
    migrate_catalog,
    migrate_node,
)

FIXTURE = Path(__file__).parent / "fixtures" / "legacy-project.yaml"
LEGACY_NODE = yaml.safe_load(FIXTURE.read_text(encoding="utf-8"))
OBSERVED_AT = "2026-08-02T00:00:00Z"


def test_migrate_node_preserves_known_card_fields_and_fixed_sections() -> None:
    record = migrate_node("aider", LEGACY_NODE, observed_at=OBSERVED_AT)

    assert record["schema_version"] == "project-publication-v1"
    assert record["card"]["use_when"] == LEGACY_NODE["use_when"]
    assert record["card"]["avoid_when"] == LEGACY_NODE["avoid_when"]
    assert list(record["sections"]) == SECTION_KEYS
    assert record["sections"]["overview"]["state"] == "inferred"
    assert record["sections"]["background_and_history"]["state"] == "unknown"
    assert record["publication"]["migration_status"] == "legacy_imported"


def test_unknown_sections_explain_why_content_is_missing() -> None:
    record = migrate_node("aider", LEGACY_NODE, observed_at=OBSERVED_AT)
    section = record["sections"]["background_and_history"]

    assert section == {
        "state": "unknown",
        "summary": "旧记录未提供该栏目，等待深度核验。",
        "body": "",
        "key_points": [],
        "evidence_ids": [],
        "confidence": "low",
        "updated_at": OBSERVED_AT,
    }


def test_repository_url_is_normalized_without_claiming_a_platform_numeric_id() -> None:
    record = migrate_node("aider", LEGACY_NODE, observed_at=OBSERVED_AT)
    source = record["repository_sources"][0]

    assert source["canonical_url"] == "https://github.com/Aider-AI/aider"
    assert source["full_name"] == "Aider-AI/aider"
    assert source["platform_repository_id"] == "legacy:Aider-AI/aider"


def test_migration_output_is_deterministic() -> None:
    first = migrate_node("aider", LEGACY_NODE, observed_at=OBSERVED_AT)
    second = migrate_node("aider", LEGACY_NODE, observed_at=OBSERVED_AT)

    assert json.dumps(first, ensure_ascii=False, sort_keys=True) == json.dumps(
        second,
        ensure_ascii=False,
        sort_keys=True,
    )


def test_duplicate_repository_urls_are_reported_and_not_silently_dropped() -> None:
    duplicate = {**LEGACY_NODE, "id": "aider-copy", "name": "Aider Copy"}
    records, report = migrate_catalog(
        {"aider": LEGACY_NODE, "aider-copy": duplicate},
        observed_at=OBSERVED_AT,
    )

    assert len(records) == 2
    assert report["source_count"] == 2
    assert report["output_count"] == 2
    assert report["duplicate_count"] == 1
    assert report["duplicates"] == [
        {
            "canonical_url": "https://github.com/Aider-AI/aider",
            "project_ids": ["aider", "aider-copy"],
        }
    ]


def test_unsupported_repository_hosts_are_reported_as_invalid() -> None:
    invalid = {**LEGACY_NODE, "repo": "https://example.com/project/"}

    records, report = migrate_catalog(
        {"unsupported": invalid},
        observed_at=OBSERVED_AT,
    )

    assert records == []
    assert report["source_count"] == 1
    assert report["output_count"] == 0
    assert report["invalid_count"] == 1
    assert report["invalid_records"] == [
        {
            "project_id": "unsupported",
            "reason": "unsupported repository host: example.com",
        }
    ]
