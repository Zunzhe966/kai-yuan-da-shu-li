#!/usr/bin/env python3
"""Export a machine-readable atlas index for remote agents (raw GitHub / CDN)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from atlas_lib import list_domains, load_edges, load_nodes  # noqa: E402
from published_catalog import build_public_record, stable_generated_at  # noqa: E402

OUT = ROOT / "dist" / "atlas-index.json"


def export_atlas_index(
    output: Path,
    nodes: dict,
    edges: list[dict],
    generated_at: str,
) -> None:
    records = [build_public_record(node_id, nodes[node_id]) for node_id in sorted(nodes)]
    payload = {
        "name": "kaiyuan-dashuli",
        "title": "开源大梳理",
        "version": "0.2.0",
        "generated_at": generated_at,
        "repo": "https://github.com/Zunzhe966/kai-yuan-da-shu-li",
        "raw_index_url": "https://raw.githubusercontent.com/Zunzhe966/kai-yuan-da-shu-li/main/dist/atlas-index.json",
        "domains": list_domains(),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": [
            {
                "id": record["id"],
                "domain": record["domain"],
                "name": record["name"],
                "repo": record["repo"],
                "summary": record["summary"],
                "tags": record["tags"],
                "language": record["language"],
                "status": record["status"],
                "use_when": record["use_when"],
                "avoid_when": record["avoid_when"],
                "niche": record["niche"],
            }
            for record in records
        ],
        "edges": edges,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    nodes = load_nodes(None)
    edges = load_edges()
    export_atlas_index(OUT, nodes, edges, stable_generated_at())
    print(f"wrote {OUT} nodes={len(nodes)} edges={len(edges)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
