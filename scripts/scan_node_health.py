#!/usr/bin/env python3
"""Scan atlas node health for exhaustive-coverage campaigns.

Reports: empty license/homepage, short summary/use/avoid, non-github repos,
GitHub 404/archived flags (optional --probe-github), nodes missing from edges.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _token() -> str | None:
    import os

    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"]
    try:
        return subprocess.check_output(
            ["gh", "auth", "token"], text=True, stderr=subprocess.DEVNULL
        ).strip() or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def _load(path: Path) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if ":" in line and not line.startswith(" ") and not line.startswith("#"):
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip()
    return fields


def _parse_github(repo: str) -> tuple[str, str] | None:
    m = re.match(r"https?://github\.com/([^/]+)/([^/#?]+)", repo.strip())
    if not m:
        return None
    owner, name = m.group(1), m.group(2)
    if name.endswith(".git"):
        name = name[:-4]
    return owner, name


def _gh_meta(owner: str, name: str, token: str | None) -> dict | None:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{owner}/{name}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "kaiyuan-dashuli-health-scan",
        },
    )
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, dict) else None
    except urllib.error.HTTPError as exc:
        return {"_http": exc.code}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe-github", action="store_true")
    parser.add_argument("--sleep", type=float, default=0.06)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "var/feedback/node-health-scan.csv",
    )
    parser.add_argument("--min-summary", type=int, default=8)
    args = parser.parse_args()

    edges_text = (ROOT / "graph/edges.yaml").read_text(encoding="utf-8")
    edged_ids = set(
        re.findall(r"(?m)^\s*-?\s*(?:from|to):\s*(\S+)", edges_text)
    )

    token = _token() if args.probe_github else None
    rows: list[dict[str, str]] = []
    counts: Counter[str] = Counter()

    for path in sorted((ROOT / "data/domains").glob("*/nodes/*.yaml")):
        domain = path.parent.parent.name
        f = _load(path)
        nid = path.stem
        issues: list[str] = []
        if not f.get("license"):
            issues.append("empty_license")
        if not f.get("homepage"):
            issues.append("empty_homepage")
        if len(f.get("summary", "")) < args.min_summary:
            issues.append("short_summary")
        if len(f.get("use_when", "")) < 4:
            issues.append("short_use_when")
        if len(f.get("avoid_when", "")) < 4:
            issues.append("short_avoid_when")
        if nid not in edged_ids:
            issues.append("no_edges")
        repo = f.get("repo", "")
        gh = _parse_github(repo)
        if not gh:
            if "github.com" not in repo:
                issues.append("non_github_repo")
            else:
                issues.append("bad_github_url")
        http_code = ""
        archived = ""
        if args.probe_github and gh:
            meta = _gh_meta(gh[0], gh[1], token)
            time.sleep(args.sleep)
            if not meta:
                issues.append("github_fetch_failed")
            elif meta.get("_http") == 404:
                issues.append("github_404")
                http_code = "404"
            elif meta.get("_http"):
                issues.append(f"github_http_{meta['_http']}")
                http_code = str(meta["_http"])
            else:
                http_code = "200"
                if meta.get("archived"):
                    issues.append("github_archived_flag")
                    archived = "true"
                if f.get("status") != "archived" and meta.get("archived"):
                    issues.append("status_mismatch_archived")
        for i in issues:
            counts[i] += 1
        if issues:
            rows.append(
                {
                    "domain": domain,
                    "id": nid,
                    "repo": repo,
                    "status": f.get("status", ""),
                    "issues": ";".join(issues),
                    "http": http_code,
                    "archived": archived,
                }
            )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(
            fh,
            fieldnames=["domain", "id", "repo", "status", "issues", "http", "archived"],
        )
        w.writeheader()
        w.writerows(rows)

    total = len(list((ROOT / "data/domains").glob("*/nodes/*.yaml")))
    print(f"nodes={total} flagged={len(rows)} out={args.out}")
    for k, v in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {k}={v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
