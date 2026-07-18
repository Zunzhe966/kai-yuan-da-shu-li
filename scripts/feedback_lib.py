from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse


ALLOWED_CHANGE_TYPES = {
    "repository_missing",
    "repository_private",
    "repository_redirected",
    "repository_archived",
    "repository_reactivated",
    "release_changed",
    "license_changed",
    "summary_mismatch",
    "deployment_changed",
    "maintenance_changed",
    "other_material_change",
}

PRIORITY = {
    "repository_missing": "urgent",
    "repository_private": "urgent",
    "repository_redirected": "important",
    "license_changed": "important",
    "repository_archived": "important",
    "repository_reactivated": "important",
    "summary_mismatch": "important",
    "release_changed": "normal",
    "deployment_changed": "normal",
    "maintenance_changed": "normal",
    "other_material_change": "normal",
}

FIELD_NAMES = {
    "project id": "project_id",
    "baseline hash": "baseline_hash",
    "change type": "change_type",
    "observed value": "observed_value",
    "short description": "short_description",
    "evidence url": "evidence_url",
    "upstream fingerprint": "upstream_fingerprint",
    "observed at": "observed_at",
}


def _clean(value: str) -> str:
    return re.sub(r"<!--.*?-->", "", value, flags=re.DOTALL).strip()


def parse_issue(issue: dict) -> dict:
    fields: dict[str, str] = {}
    parts = re.split(r"(?im)^###\s+(.+?)\s*$", str(issue.get("body") or ""))
    for index in range(1, len(parts), 2):
        heading = " ".join(parts[index].lower().split())
        field = FIELD_NAMES.get(heading)
        if field:
            fields[field] = _clean(parts[index + 1])
    fields.update(
        {
            "issue_number": issue.get("number"),
            "issue_node_id": issue.get("id"),
            "issue_url": issue.get("url"),
            "issue_created_at": issue.get("createdAt"),
            "reporter": (issue.get("author") or {}).get("login"),
        }
    )
    return fields


def _parse_time(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def validate_report(report: dict, catalog: dict[str, dict]) -> list[str]:
    errors: list[str] = []
    required = tuple(FIELD_NAMES.values())
    for field in required:
        if not str(report.get(field) or "").strip():
            errors.append(f"missing {field}")

    project_id = str(report.get("project_id") or "")
    baseline = str(report.get("baseline_hash") or "")
    if project_id not in catalog:
        errors.append("unknown project_id")
    elif baseline != catalog[project_id].get("content_hash"):
        errors.append("stale baseline_hash")
    if not re.fullmatch(r"[0-9a-f]{64}", baseline):
        errors.append("invalid baseline_hash")
    if report.get("change_type") not in ALLOWED_CHANGE_TYPES:
        errors.append("unsupported change_type")
    if len(str(report.get("observed_value") or "")) > 300:
        errors.append("observed_value too long")
    if len(str(report.get("short_description") or "")) > 500:
        errors.append("short_description too long")
    if len(str(report.get("upstream_fingerprint") or "")) > 200:
        errors.append("upstream_fingerprint too long")

    evidence = urlparse(str(report.get("evidence_url") or ""))
    if evidence.scheme != "https" or not evidence.netloc:
        errors.append("evidence_url must use HTTPS")

    observed_at = _parse_time(str(report.get("observed_at") or ""))
    if observed_at is None:
        errors.append("invalid observed_at")
    elif observed_at > datetime.now(timezone.utc) + timedelta(hours=24):
        errors.append("observed_at is too far in the future")
    return errors


def event_fingerprint(report: dict) -> str:
    payload = "\n".join(
        str(report.get(field) or "")
        for field in ("project_id", "baseline_hash", "change_type", "upstream_fingerprint")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def aggregate_reports(reports: list[dict], confirmation_cap: int = 5) -> list[dict]:
    if confirmation_cap < 1:
        raise ValueError("confirmation_cap must be positive")
    grouped: dict[str, dict] = {}
    for report in reports:
        if report.get("change_type") not in ALLOWED_CHANGE_TYPES:
            continue
        fingerprint = event_fingerprint(report)
        event = grouped.get(fingerprint)
        if event is None:
            event = {
                key: report.get(key)
                for key in (
                    "project_id",
                    "baseline_hash",
                    "change_type",
                    "observed_value",
                    "short_description",
                    "evidence_url",
                    "upstream_fingerprint",
                    "observed_at",
                )
            }
            event.update(
                {
                    "fingerprint": fingerprint,
                    "priority": PRIORITY[str(report["change_type"])],
                    "confirmations": 0,
                    "issue_numbers": [],
                    "issue_node_ids": [],
                    "reporters": [],
                }
            )
            grouped[fingerprint] = event
        event["confirmations"] = min(confirmation_cap, event["confirmations"] + 1)
        for target, source in (
            ("issue_numbers", "issue_number"),
            ("issue_node_ids", "issue_node_id"),
            ("reporters", "reporter"),
        ):
            value = report.get(source)
            if value is not None and value not in event[target] and len(event[target]) < confirmation_cap:
                event[target].append(value)

    priority_order = {"urgent": 0, "important": 1, "normal": 2}
    return sorted(
        grouped.values(),
        key=lambda event: (
            priority_order[event["priority"]],
            str(event["project_id"]),
            str(event["fingerprint"]),
        ),
    )
