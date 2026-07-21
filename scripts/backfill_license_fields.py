#!/usr/bin/env python3
"""Backfill license / verified_at / source_updated_at / verification_status on node YAML.

Uses GitHub API (gh auth or GITHUB_TOKEN). Does not invent licenses: unknown stays empty
and verification_status=needs_review.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPDX_HINTS = {
    "mit": "MIT",
    "apache-2.0": "Apache-2.0",
    "apache 2.0": "Apache-2.0",
    "bsd-3-clause": "BSD-3-Clause",
    "bsd-2-clause": "BSD-2-Clause",
    "gpl-3.0": "GPL-3.0",
    "gpl-2.0": "GPL-2.0",
    "agpl-3.0": "AGPL-3.0",
    "lgpl-3.0": "LGPL-3.0",
    "mpl-2.0": "MPL-2.0",
    "isc": "ISC",
    "unlicense": "Unlicense",
    "cc0-1.0": "CC0-1.0",
    "0bsd": "0BSD",
}


def _token() -> str | None:
    import os

    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"]
    try:
        out = subprocess.check_output(
            ["gh", "auth", "token"], text=True, stderr=subprocess.DEVNULL
        ).strip()
        return out or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def _gh_get(url: str, token: str | None) -> dict | None:
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "kaiyuan-dashuli-backfill"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in {404, 403}:
            return None
        raise


def _parse_repo(repo_url: str) -> tuple[str, str] | None:
    m = re.match(r"https?://github\.com/([^/]+)/([^/#?]+)", repo_url.strip())
    if not m:
        return None
    owner, name = m.group(1), m.group(2)
    if name.endswith(".git"):
        name = name[:-4]
    return owner, name


def _normalize_license(raw: str | None) -> str:
    if not raw:
        return ""
    key = raw.strip().lower()
    return SPDX_HINTS.get(key, raw.strip())


def _load_simple_yaml(path: Path) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if ":" in line and not line.startswith(" ") and not line.startswith("#"):
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip()
    return fields


def _write_fields(path: Path, updates: dict[str, str]) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    lines = text.splitlines(keepends=True)
    existing = set()
    for i, line in enumerate(lines):
        if ":" in line and not line.startswith(" ") and not line.startswith("#"):
            key = line.split(":", 1)[0].strip()
            if key in updates:
                existing.add(key)
                nl = "\n" if line.endswith("\n") else ""
                lines[i] = f"{key}: {updates[key]}{nl}"
    # append missing keys before end
    missing = [k for k in updates if k not in existing]
    if missing:
        body = "".join(lines)
        if not body.endswith("\n"):
            body += "\n"
        for k in missing:
            body += f"{k}: {updates[k]}\n"
        new_text = body
    else:
        new_text = "".join(lines)
    if new_text != original:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domains", nargs="+", required=True)
    parser.add_argument("--sleep", type=float, default=0.15)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    token = _token()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    changed = 0
    skipped = 0
    unknown = 0
    for domain in args.domains:
        nodes_dir = ROOT / "data/domains" / domain / "nodes"
        for path in sorted(nodes_dir.glob("*.yaml")):
            fields = _load_simple_yaml(path)
            if fields.get("license") and fields.get("verified_at") and fields.get("source_updated_at"):
                skipped += 1
                continue
            parsed = _parse_repo(fields.get("repo", ""))
            if not parsed:
                unknown += 1
                continue
            owner, name = parsed
            meta = _gh_get(f"https://api.github.com/repos/{owner}/{name}", token)
            time.sleep(args.sleep)
            if not meta:
                unknown += 1
                continue
            lic_obj = meta.get("license") or {}
            spdx = _normalize_license(lic_obj.get("spdx_id") if isinstance(lic_obj, dict) else None)
            if spdx in {"", "NOASSERTION", "OTHER"}:
                spdx = ""
            pushed = meta.get("pushed_at") or meta.get("updated_at") or ""
            status = "verified" if spdx else "needs_review"
            updates = {
                "license": spdx if spdx else (fields.get("license") or '""'),
                "source_updated_at": pushed,
                "verified_at": now,
                "verification_status": status,
            }
            # keep empty license as blank string without quotes noise
            if updates["license"] in {'""', "''"}:
                updates["license"] = ""
            print(f"{domain}/{path.stem}: license={updates['license'] or 'UNKNOWN'} status={status}")
            if not args.dry_run and _write_fields(path, updates):
                changed += 1
    print(f"changed={changed} skipped={skipped} unknown={unknown}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
