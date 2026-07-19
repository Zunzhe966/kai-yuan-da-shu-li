from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.feedback_lib import aggregate_reports, parse_issue, validate_report  # noqa: E402


REPOSITORY = "Zunzhe966/kaiyuan-dashuli"


def _atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
    ) as handle:
        temporary = Path(handle.name)
        json.dump(payload, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write("\n")
    temporary.replace(path)


def import_issue_payload(issues: list[dict], catalog: dict[str, dict], state_path: Path) -> dict:
    accepted: list[dict] = []
    rejected = 0
    for issue in issues:
        report = parse_issue(issue)
        errors = validate_report(report, catalog)
        if errors:
            rejected += 1
            print(
                f"issue #{issue.get('number', '?')} rejected: {', '.join(errors)}",
                file=sys.stderr,
            )
            continue
        accepted.append(report)
    events = aggregate_reports(accepted)
    state = {
        "imported_at": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "accepted_reports": len(accepted),
        "rejected_reports": rejected,
        "unique_events": len(events),
        "events": events,
    }
    _atomic_json(state_path, state)
    return state


def load_catalog(nodes_directory: Path) -> dict[str, dict]:
    records: dict[str, dict] = {}
    for path in sorted(nodes_directory.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        records[str(record["id"])] = record
    if not records:
        raise RuntimeError(f"no catalog records found in {nodes_directory}")
    return records


def load_issues(issues_json: Path | None) -> list[dict]:
    if issues_json is not None:
        return json.loads(issues_json.read_text(encoding="utf-8"))
    command = [
        "gh",
        "issue",
        "list",
        "--repo",
        REPOSITORY,
        "--state",
        "open",
        "--label",
        "agent-change-report",
        "--limit",
        "1000",
        "--json",
        "id,number,title,body,url,createdAt,author",
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issues-json", type=Path)
    parser.add_argument("--catalog", type=Path, default=ROOT / "dist/v1/nodes")
    parser.add_argument("--state", type=Path, default=ROOT / "var/feedback/open-events.json")
    args = parser.parse_args()
    try:
        catalog = load_catalog(args.catalog)
        issues = load_issues(args.issues_json)
    except (OSError, RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"feedback import failed: {error}", file=sys.stderr)
        return 1
    result = import_issue_payload(issues, catalog, args.state)
    print(
        f"accepted={result['accepted_reports']} rejected={result['rejected_reports']} "
        f"unique={result['unique_events']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
