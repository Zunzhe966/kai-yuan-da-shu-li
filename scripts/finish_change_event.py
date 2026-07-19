from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
RESOLUTIONS = {"upstream-changed", "false-positive", "already-fixed"}


def _git(*args: str) -> bool:
    return subprocess.run(
        ["git", *args], capture_output=True, text=True
    ).returncode == 0


def _atomic_json(path: Path, payload: dict) -> None:
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False
    ) as handle:
        temporary = Path(handle.name)
        json.dump(payload, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write("\n")
    temporary.replace(path)


def _cleanup_digests(digest_dir: Path, open_fingerprints: set[str]) -> None:
    if not digest_dir.exists():
        return
    for digest in digest_dir.glob("*.md"):
        text = digest.read_text(encoding="utf-8")
        fingerprints = set(re.findall(r"[0-9a-f]{64}", text))
        if fingerprints and fingerprints.isdisjoint(open_fingerprints):
            digest.unlink()


def finish_event(
    *,
    state_path: Path,
    fingerprint: str,
    resolution: str,
    evidence_url: str,
    verified_at: str,
    verifier: str,
    formal_commit: str,
    verification_dir: Path,
    digest_dir: Path,
) -> list[str]:
    if resolution not in RESOLUTIONS:
        raise ValueError("unsupported resolution")
    if not re.fullmatch(r"[0-9a-f]{64}", fingerprint):
        raise ValueError("invalid fingerprint")
    evidence = urlparse(evidence_url)
    if evidence.scheme != "https" or not evidence.netloc:
        raise ValueError("evidence URL must use HTTPS")
    try:
        parsed_time = datetime.fromisoformat(verified_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("invalid verified time") from error
    if parsed_time.tzinfo is None:
        raise ValueError("invalid verified time")
    if not _git("cat-file", "-e", f"{formal_commit}^{{commit}}"):
        raise ValueError("formal commit does not exist")
    if resolution == "upstream-changed" and not _git("merge-base", "--is-ancestor", formal_commit, "HEAD"):
        raise ValueError("formal commit is not an ancestor of HEAD")

    state = json.loads(state_path.read_text(encoding="utf-8"))
    events = list(state.get("events") or [])
    event = next((item for item in events if item.get("fingerprint") == fingerprint), None)
    if event is None:
        raise ValueError("event is not open")

    verification_dir.mkdir(parents=True, exist_ok=True)
    month = parsed_time.astimezone().strftime("%Y-%m")
    record = {
        "fingerprint": fingerprint,
        "project_id": event["project_id"],
        "resolution": resolution,
        "evidence_url": evidence_url,
        "verified_at": verified_at,
        "verifier": verifier,
        "formal_commit": formal_commit,
    }
    with (verification_dir / f"{month}.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n")

    state["events"] = [item for item in events if item.get("fingerprint") != fingerprint]
    state["unique_events"] = len(state["events"])
    _atomic_json(state_path, state)
    _cleanup_digests(digest_dir, {item["fingerprint"] for item in state["events"]})
    return [
        "gh api graphql -f query='mutation($issueId:ID!){deleteIssue(input:{issueId:$issueId}){clientMutationId}}' "
        f"-F issueId={node_id}"
        for node_id in event.get("issue_node_ids", [])
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", type=Path, default=ROOT / "var/feedback/open-events.json")
    parser.add_argument("--fingerprint", required=True)
    parser.add_argument("--resolution", choices=sorted(RESOLUTIONS), required=True)
    parser.add_argument("--evidence-url", required=True)
    parser.add_argument("--verified-at", required=True)
    parser.add_argument("--verifier", default="Codex")
    parser.add_argument("--formal-commit", required=True)
    parser.add_argument("--verification-dir", type=Path, default=ROOT / "data/verification")
    parser.add_argument("--digest-dir", type=Path, default=ROOT / "var/feedback/digests")
    parser.add_argument("--delete-github-issues", action="store_true")
    args = parser.parse_args()
    commands = finish_event(
        state_path=args.state,
        fingerprint=args.fingerprint,
        resolution=args.resolution,
        evidence_url=args.evidence_url,
        verified_at=args.verified_at,
        verifier=args.verifier,
        formal_commit=args.formal_commit,
        verification_dir=args.verification_dir,
        digest_dir=args.digest_dir,
    )
    for command in commands:
        print(command)
    if args.delete_github_issues:
        for command in commands:
            subprocess.run(command, shell=True, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
