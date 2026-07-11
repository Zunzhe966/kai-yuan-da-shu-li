#!/usr/bin/env python3
"""Harvest candidate repos into quarantine — never writes formal domain nodes directly.

Usage:
  .venv/bin/python scripts/harvest_to_quarantine.py --domain devops --from-file seeds.txt
  .venv/bin/python scripts/harvest_to_quarantine.py --promote <quarantine-id> --domain devops

seeds.txt lines: id|name|repo|summary|tags(comma)
Promoted nodes still require use_when/avoid_when before validate_graph passes.
"""
from __future__ import annotations

import argparse
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUAR = ROOT / "data" / "quarantine"


def slug(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "item"


def write_candidate(domain: str, nid: str, name: str, repo: str, summary: str, tags: str) -> Path:
    QUAR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = QUAR / f"{domain}__{nid}__{ts}.yaml"
    body = f"""# QUARANTINE — not part of the formal graph until promoted + fields completed
quarantine: true
domain: {domain}
id: {nid}
type: project
name: {name}
repo: {repo}
summary: {summary}
tags: [{tags}]
language: unknown
status: candidate
use_when: TBD
avoid_when: TBD
niche: TBD
harvested_at: {ts}
"""
    path.write_text(body, encoding="utf-8")
    return path


def promote(path: Path, domain: str) -> Path:
    text = path.read_text(encoding="utf-8")
    fields = {}
    for line in text.splitlines():
        if line.startswith("#") or ":" not in line or line.startswith(" "):
            continue
        k, v = line.split(":", 1)
        fields[k.strip()] = v.strip()
    nid = fields.get("id")
    if not nid:
        raise SystemExit("quarantine file missing id")
    if fields.get("use_when") in (None, "", "TBD") or fields.get("avoid_when") in (None, "", "TBD"):
        raise SystemExit("refuse promote: use_when/avoid_when still TBD — edit quarantine file first")
    out_dir = ROOT / "data" / "domains" / domain / "nodes"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{nid}.yaml"
    clean = "\n".join(
        f"{k}: {fields[k]}"
        for k in (
            "id",
            "type",
            "name",
            "repo",
            "summary",
            "tags",
            "language",
            "status",
            "use_when",
            "avoid_when",
            "niche",
        )
        if k in fields
    ) + "\n"
    out.write_text(clean, encoding="utf-8")
    path.rename(path.with_suffix(path.suffix + ".promoted"))
    print(f"promoted -> {out}")
    print("NOTE: add id to data/domains/<domain>/_index.yaml before validate_graph")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", required=True)
    ap.add_argument("--from-file")
    ap.add_argument("--promote")
    args = ap.parse_args()
    if args.promote:
        promote(Path(args.promote), args.domain)
        return 0
    if not args.from_file:
        raise SystemExit("need --from-file or --promote")
    n = 0
    for line in Path(args.from_file).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 4:
            raise SystemExit(f"bad line: {line}")
        nid, name, repo, summary = parts[:4]
        tags = parts[4] if len(parts) > 4 else "devops"
        nid = slug(nid)
        p = write_candidate(args.domain, nid, name, repo, summary, tags)
        print(p)
        n += 1
    print(f"quarantined={n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
