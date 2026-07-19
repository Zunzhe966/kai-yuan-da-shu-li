from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from atlas_lib import load_edges, load_nodes  # noqa: E402
from published_catalog import build_public_record, stable_generated_at  # noqa: E402


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n",
        encoding="utf-8",
    )


def _facet_values(records: list[dict[str, Any]], key: str) -> list[str]:
    return sorted({str(record[key]) for record in records if record.get(key)})


def export_catalog(
    output: Path,
    nodes: dict[str, dict[str, Any]],
    edges: list[dict[str, str]],
    generated_at: str,
) -> None:
    records = [build_public_record(node_id, nodes[node_id]) for node_id in sorted(nodes)]
    domains = _facet_values(records, "domain")
    tags = sorted({tag for record in records for tag in record["tags"]})
    if output.exists():
        if output.is_symlink() or not output.is_dir():
            raise ValueError(f"catalog output must be a directory: {output}")
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)
    _write_json(
        output / "meta.json",
        {
            "schema_version": "1.0.0",
            "generated_at": generated_at,
            "node_count": len(records),
            "edge_count": len(edges),
            "domains": domains,
            "facets": {
                "languages": _facet_values(records, "language"),
                "licenses": _facet_values(records, "license"),
                "statuses": _facet_values(records, "status"),
                "tags": tags,
            },
            "surfaces": {
                "catalog_jsonl": "catalog.jsonl",
                "search_index": "search-index.json",
                "domain_template": "domains/{domain}.json",
                "node_template": "nodes/{id}.json",
            },
            "feedback_policy": "report-only-material-mismatches",
        },
    )
    _write_json(output / "catalog.json", {"nodes": records, "edges": edges})
    (output / "catalog.jsonl").write_text(
        "".join(
            json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
            for record in records
        ),
        encoding="utf-8",
    )
    _write_json(
        output / "search-index.json",
        [
            {
                "id": record["id"],
                "domain": record["domain"],
                "name": record["name"],
                "summary": record["summary"],
                "tags": record["tags"],
                "language": record["language"],
                "license": record["license"],
                "status": record["status"],
            }
            for record in records
        ],
    )
    for domain in domains:
        _write_json(
            output / "domains" / f"{domain}.json",
            [record for record in records if record["domain"] == domain],
        )
    for record in records:
        _write_json(output / "nodes" / f"{record['id']}.json", record)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist/v1")
    args = parser.parse_args()
    generated_at = stable_generated_at()
    export_catalog(args.output, load_nodes(None), load_edges(), generated_at)
    print(f"wrote catalog v1 to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
