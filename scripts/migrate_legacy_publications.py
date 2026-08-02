#!/usr/bin/env python3
"""Convert legacy catalog nodes into project-publication-v1 JSONL."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from atlas_lib import load_nodes  # noqa: E402

SECTION_KEYS = [
    "overview",
    "problem_and_positioning",
    "background_and_history",
    "creators_and_organization",
    "design_philosophy",
    "architecture_and_technology",
    "core_capabilities",
    "installation_and_usage",
    "limitations_and_risks",
    "maintenance_and_releases",
    "ecosystem_and_interoperability",
    "alternatives_and_selection",
    "community_and_channels",
    "editorial_assessment",
]

UNKNOWN_SUMMARY = "旧记录未提供该栏目，等待深度核验。"
HUB_REPOSITORY = "https://github.com/Zunzhe966/kai-yuan-da-shu-li"
PLATFORMS = {
    "github.com": "github",
    "gitlab.com": "gitlab",
    "gitee.com": "gitee",
    "codeberg.org": "codeberg",
}


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _nullable_text(value: Any) -> str | None:
    text = _text(value)
    return text or None


def _timestamp(value: Any) -> str | None:
    if isinstance(value, datetime):
        value = value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    text = _text(value)
    return text or None


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [text for item in value if (text := _text(item))]
    text = _text(value).strip("[]")
    return [item.strip() for item in text.split(",") if item.strip()]


def normalize_repository_url(value: Any) -> tuple[str, str, str, str]:
    raw = _text(value)
    if not raw:
        raise ValueError("legacy node has no repository URL")
    parts = urlsplit(raw)
    host = parts.netloc.lower()
    platform = PLATFORMS.get(host)
    if not platform:
        raise ValueError(f"unsupported repository host: {host or raw}")
    path = parts.path.rstrip("/")
    if path.lower().endswith(".git"):
        path = path[:-4]
    segments = [segment for segment in path.split("/") if segment]
    if len(segments) < 2:
        raise ValueError(f"invalid repository path: {raw}")
    full_name = "/".join(segments[:2])
    canonical_url = urlunsplit(("https", host, f"/{full_name}", "", ""))
    return platform, canonical_url, full_name, f"legacy:{full_name}"


def _source_path(node_id: str, node: Mapping[str, Any]) -> str:
    domain = _text(node.get("domain"))
    if domain:
        return f"data/domains/{domain}/nodes/{node_id}.yaml"
    return f"data/legacy/{node_id}.yaml"


def _evidence_id(node_id: str) -> str:
    return f"legacy-node-{node_id}"


def _unknown_section(observed_at: str) -> dict[str, Any]:
    return {
        "state": "unknown",
        "summary": UNKNOWN_SUMMARY,
        "body": "",
        "key_points": [],
        "evidence_ids": [],
        "confidence": "low",
        "updated_at": observed_at,
    }


def _inferred_section(
    summary: str,
    observed_at: str,
    evidence_id: str,
    *,
    key_points: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "state": "inferred",
        "summary": summary,
        "body": "",
        "key_points": key_points or [],
        "evidence_ids": [evidence_id],
        "confidence": "medium",
        "updated_at": observed_at,
    }


def migrate_node(
    node_id: str,
    node: Mapping[str, Any],
    *,
    observed_at: str,
) -> dict[str, Any]:
    platform, canonical_url, full_name, platform_repository_id = (
        normalize_repository_url(node.get("repo"))
    )
    evidence_id = _evidence_id(node_id)
    source_path = _source_path(node_id, node)
    name = _text(node.get("name")) or node_id
    summary = _text(node.get("summary"))
    use_when = _text(node.get("use_when"))
    avoid_when = _text(node.get("avoid_when"))
    niche = _text(node.get("niche"))
    tags = _as_list(node.get("tag_list") or node.get("tags"))
    language = _text(node.get("language"))
    license_name = _text(node.get("license"))
    status = _text(node.get("status")) or "unknown"
    source_updated_at = _timestamp(node.get("source_updated_at"))
    verified_at = _timestamp(node.get("verified_at"))

    sections = {key: _unknown_section(observed_at) for key in SECTION_KEYS}
    sections["overview"] = _inferred_section(
        summary,
        observed_at,
        evidence_id,
    )
    positioning = "；".join(
        item for item in (f"适用：{use_when}" if use_when else "", niche) if item
    )
    sections["problem_and_positioning"] = _inferred_section(
        positioning or summary,
        observed_at,
        evidence_id,
    )
    sections["core_capabilities"] = _inferred_section(
        summary,
        observed_at,
        evidence_id,
        key_points=tags,
    )
    sections["limitations_and_risks"] = _inferred_section(
        avoid_when,
        observed_at,
        evidence_id,
    )

    source_record = json.dumps(node, ensure_ascii=False, sort_keys=True, default=str)
    source_hash = hashlib.sha256(source_record.encode("utf-8")).hexdigest()
    verified_state = _text(node.get("verification_status"))
    card_state = verified_state if verified_state in {
        "verified",
        "inferred",
        "unknown",
        "conflicting",
        "stale",
        "not_applicable",
    } else "inferred"

    return {
        "schema_version": "project-publication-v1",
        "project_id": node_id,
        "record_state": "published",
        "repository_sources": [
            {
                "platform": platform,
                "platform_repository_id": platform_repository_id,
                "canonical_url": canonical_url,
                "full_name": full_name,
                "role": "primary",
                "visibility": "public",
                "default_branch": None,
                "observed_oid": None,
                "created_at": None,
                "updated_at": source_updated_at,
                "pushed_at": None,
                "observed_at": observed_at,
                "is_fork": False,
                "mirror_url": None,
                "archived": status == "archived",
                "disabled": False,
                "evidence_ids": [evidence_id],
            }
        ],
        "identity": {
            "name": name,
            "chinese_name": None,
            "aliases": [],
            "former_names": [],
            "objective_definition": summary,
            "website_url": None,
            "documentation_url": None,
            "demo_url": None,
            "download_url": None,
            "first_published_at": None,
            "lifecycle": status,
            "visual": {
                "url": None,
                "kind": "none",
                "source_url": None,
                "usage_basis": "legacy_record_did_not_provide_visual",
            },
        },
        "attribution": [],
        "discovery": {
            "domains": [_text(node.get("domain") or node.get("related_ecosystem"))],
            "subcategories": [niche] if niche else [],
            "tasks": [use_when] if use_when else [],
            "capabilities": tags,
            "project_types": [],
            "languages": [language] if language else [],
            "frameworks": [],
            "runtimes": [],
            "protocols": [],
            "delivery_methods": [],
            "package_formats": [],
            "operating_systems": [],
            "runtime_targets": [],
            "hardware_requirements": [],
            "natural_languages": [],
            "open_source_nature": "open_source",
            "licenses": [license_name] if license_name else [],
            "maturity": "unknown",
            "maintenance_status": status,
            "latest_activity_at": source_updated_at,
            "search_aliases": [],
            "canonical_keywords": tags,
        },
        "card": {
            "name": name,
            "chinese_name": None,
            "summary": summary[:80],
            "use_when": use_when,
            "avoid_when": avoid_when,
            "primary_category": niche or _text(node.get("domain")) or "unknown",
            "primary_language": language or None,
            "license": license_name or None,
            "maintenance_status": status,
            "primary_creator": None,
            "verification_status": card_state,
            "verified_at": verified_at,
        },
        "sections": sections,
        "evidence": [
            {
                "evidence_id": evidence_id,
                "url": f"{HUB_REPOSITORY}/blob/main/{source_path}",
                "source_type": "legacy_catalog_record",
                "retrieved_at": observed_at,
                "supports": [
                    "identity.objective_definition",
                    "card",
                    "discovery",
                    "sections.overview",
                    "sections.problem_and_positioning",
                    "sections.core_capabilities",
                    "sections.limitations_and_risks",
                ],
                "fact_summary": f"由旧目录记录 {source_path} 原样迁移。",
                "applicable_version": None,
                "content_hash": f"sha256:{source_hash}",
            }
        ],
        "field_states": {
            "identity.objective_definition": "inferred",
            "card.summary": "inferred",
            "card.use_when": "inferred",
            "card.avoid_when": "inferred",
            "discovery": "inferred",
        },
        "editorial": {
            "researcher_actor_ids": ["legacy-catalog"],
            "editor_actor_ids": ["legacy-migration"],
            "reviewer_actor_ids": [],
            "work_notes": "由旧版 YAML 目录确定性迁移，未进行新增事实推断。",
            "internal_notes": "",
        },
        "publication": {
            "base_revision": 0,
            "revision": 1,
            "status": "published",
            "review_decision": "legacy_import",
            "published_at": observed_at,
            "withdrawn_reason": None,
            "superseded_by_revision": None,
            "migration_status": "legacy_imported",
        },
    }


def migrate_catalog(
    nodes: Mapping[str, Mapping[str, Any]],
    *,
    observed_at: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    records: list[dict[str, Any]] = []
    invalid_records: list[dict[str, str]] = []
    for node_id in sorted(nodes):
        try:
            records.append(
                migrate_node(node_id, nodes[node_id], observed_at=observed_at)
            )
        except ValueError as error:
            invalid_records.append({"project_id": node_id, "reason": str(error)})
    repositories: dict[str, list[str]] = defaultdict(list)
    for record in records:
        repositories[record["repository_sources"][0]["canonical_url"]].append(
            record["project_id"]
        )
    duplicates = [
        {"canonical_url": url, "project_ids": sorted(project_ids)}
        for url, project_ids in sorted(repositories.items())
        if len(project_ids) > 1
    ]
    unknown_counts = Counter()
    for record in records:
        unknown_counts.update(
            key
            for key, section in record["sections"].items()
            if section["state"] == "unknown"
        )
    report = {
        "schema_version": "project-publication-v1",
        "observed_at": observed_at,
        "source_count": len(nodes),
        "output_count": len(records),
        "duplicate_count": len(duplicates),
        "invalid_count": len(invalid_records),
        "invalid_records": invalid_records,
        "duplicates": duplicates,
        "unknown_section_counts": {
            key: unknown_counts[key] for key in SECTION_KEYS
        },
    }
    return records, report


def _default_observed_at() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--observed-at", default=_default_observed_at())
    args = parser.parse_args()

    records, report = migrate_catalog(
        load_nodes(None),
        observed_at=args.observed_at,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(
                json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                + "\n"
            )
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        f"migrated {report['output_count']}/{report['source_count']} records; "
        f"duplicates={report['duplicate_count']} invalid={report['invalid_count']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
