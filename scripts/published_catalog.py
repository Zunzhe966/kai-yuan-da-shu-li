from __future__ import annotations

import hashlib
import json
from typing import Any


def _tags(node: dict[str, Any]) -> list[str]:
    values = node.get("tag_list", node.get("tags", []))
    if isinstance(values, str):
        values = [values]
    return sorted({str(value).strip() for value in values if str(value).strip()})


def _visible_payload(node_id: str, node: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": node_id,
        "domain": str(node.get("domain", "")),
        "name": str(node.get("name", "")),
        "repo": str(node.get("repo", "")),
        "summary": str(node.get("summary", "")),
        "tags": _tags(node),
        "language": str(node.get("language", "")),
        "license": str(node.get("license", "")),
        "status": str(node.get("status", "")),
        "use_when": str(node.get("use_when", "")),
        "avoid_when": str(node.get("avoid_when", "")),
        "niche": str(node.get("niche", "")),
    }


def stable_content_hash(node: dict[str, Any], node_id: str | None = None) -> str:
    payload = _visible_payload(node_id or str(node.get("id", "")), node)
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def build_public_record(node_id: str, node: dict[str, Any]) -> dict[str, Any]:
    record = _visible_payload(node_id, node)
    evidence = node.get("evidence_urls") or ([record["repo"]] if record["repo"] else [])
    record.update(
        {
            "source_updated_at": node.get("source_updated_at") or None,
            "verified_at": node.get("verified_at") or None,
            "verification_status": node.get("verification_status", "unverified"),
            "evidence_urls": list(evidence),
            "content_hash": stable_content_hash(node, node_id),
        }
    )
    return record
