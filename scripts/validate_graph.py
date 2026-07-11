#!/usr/bin/env python3
"""Validate atlas graph across all domains under data/domains/."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = ROOT / "data/domains"
EDGES = ROOT / "graph/edges.yaml"
REQUIRED = ("id", "name", "repo", "summary", "tags", "status", "use_when", "avoid_when")


def parse_simple_yaml_fields(text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith(" ") or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        fields[k.strip()] = v.strip()
    return fields


def validate_domain(domain_dir: Path, errors: list[str]) -> set[str]:
    nodes_dir = domain_dir / "nodes"
    index = domain_dir / "_index.yaml"
    ids: set[str] = set()
    if not nodes_dir.is_dir():
        errors.append(f"{domain_dir.name}: missing nodes/")
        return ids
    for path in sorted(nodes_dir.glob("*.yaml")):
        text = path.read_text(encoding="utf-8")
        fields = parse_simple_yaml_fields(text)
        nid = fields.get("id", "")
        if nid != path.stem:
            errors.append(f"{domain_dir.name}/{path.name}: id '{nid}' != stem '{path.stem}'")
        for key in REQUIRED:
            if key not in fields or not fields[key]:
                errors.append(f"{domain_dir.name}/{path.name}: missing '{key}'")
        if "repo" in fields and not fields["repo"].startswith("http"):
            errors.append(f"{domain_dir.name}/{path.name}: repo must be http(s)")
        ids.add(path.stem)

    if not index.exists():
        errors.append(f"{domain_dir.name}: missing _index.yaml")
        return ids

    flat: set[str] = set()
    for block in re.findall(r"node_ids:\s*\[([^\]]+)\]", index.read_text(encoding="utf-8")):
        for part in block.split(","):
            part = part.strip()
            if part:
                flat.add(part)
    for i in flat:
        if i not in ids:
            errors.append(f"{domain_dir.name}/_index.yaml missing node '{i}'")
    for i in ids:
        if i not in flat:
            errors.append(f"{domain_dir.name}: node '{i}' not listed in _index.yaml")
    return ids


def main() -> int:
    errors: list[str] = []
    all_ids: set[str] = set()
    domain_dirs = sorted(p for p in DOMAINS.iterdir() if p.is_dir() and not p.name.startswith("_"))
    for d in domain_dirs:
        all_ids |= validate_domain(d, errors)

    edges_text = EDGES.read_text(encoding="utf-8")
    edge_ids = set(re.findall(r"^\s+(?:from|to):\s*(\S+)", edges_text, re.M))
    for e in edge_ids:
        if e not in all_ids:
            errors.append(f"edges.yaml endpoint missing node '{e}'")
    edge_count = len(re.findall(r"^\s+-\s+from:", edges_text, re.M))

    print(f"domains={len(domain_dirs)} nodes={len(all_ids)} edges={edge_count}")
    if errors:
        print(f"ERRORS={len(errors)}")
        for e in errors:
            print(f"- {e}")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
