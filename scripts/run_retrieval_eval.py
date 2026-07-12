#!/usr/bin/env python3
"""Run agent retrieval eval against the full atlas (AGENTS.md protocol approximation)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from atlas_lib import load_nodes, search_projects  # noqa: E402

QUERIES = ROOT / "docs/evals/queries-v1.yaml"
OUT = ROOT / "docs/evals/agent-retrieval-eval.md"


def load_queries() -> list[dict]:
    queries: list[dict] = []
    q: dict | None = None
    for line in QUERIES.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("- id:"):
            if q and q.get("query") and q.get("expect_any"):
                queries.append(q)
            q = {"id": line.split(":", 1)[1].strip(), "domain": "all"}
            continue
        if q is None:
            continue
        if line.strip().startswith("query:"):
            q["query"] = line.split(":", 1)[1].strip()
        elif line.strip().startswith("domain:"):
            q["domain"] = line.split(":", 1)[1].strip()
        elif "intent_tags:" in line:
            q["intent_tags"] = [
                x.strip() for x in line.split("[", 1)[1].rstrip("]").split(",") if x.strip()
            ]
        elif "expect_any:" in line:
            q["expect_any"] = [
                x.strip() for x in line.split("[", 1)[1].rstrip("]").split(",") if x.strip()
            ]
    if q and q.get("query") and q.get("expect_any"):
        queries.append(q)
    return queries


def main() -> int:
    nodes = load_nodes(None)
    queries = load_queries()
    lines = [
        "# Agent retrieval eval v1",
        "",
        "协议：AGENTS.md（全域检索 → tags + use_when/avoid_when 重排 → 1–3 推荐）",
        "",
        "默认 `domain=all`（模拟 Agent 不预先知道垂直域）。",
        "",
        "| ID | Query | Top推荐 | 命中期望 | 合规 |",
        "|---|---|---|---|---|",
    ]
    pass_n = 0
    results = []
    for q in queries:
        top_rows = search_projects(
            q["query"],
            tags=q.get("intent_tags"),
            domain=q.get("domain", "all"),
            limit=3,
        )
        top = [r["id"] for r in top_rows]
        hit = any(x in top for x in q["expect_any"])
        compliant = (
            bool(top)
            and all(nodes[t].get("use_when") and nodes[t].get("avoid_when") for t in top)
            and 1 <= len(top) <= 3
        )
        ok = hit and compliant
        if ok:
            pass_n += 1
        results.append((q, top, hit, compliant, ok))
        lines.append(
            f"| {q['id']} | {q['query']} | {', '.join(top)} | {'Y' if hit else 'N'} | {'Y' if compliant else 'N'} |"
        )
    rate = pass_n / len(queries) if queries else 0.0
    lines += [
        "",
        f"**通过率：{pass_n}/{len(queries)} = {rate:.0%}**",
        "",
        "判定阈值：≥80%",
        "",
        "## 逐条取舍摘要",
        "",
    ]
    for q, top, hit, compliant, ok in results:
        lines.append(f"### {q['id']} — {q['query']}")
        for t in top:
            n = nodes[t]
            lines.append(f"- **{n.get('name')}** (`{t}` / {n.get('domain')})")
            lines.append(f"  - use_when: {n.get('use_when')}")
            lines.append(f"  - avoid_when: {n.get('avoid_when')}")
            lines.append(f"  - repo: {n.get('repo')}")
        lines.append(f"- result: {'PASS' if ok else 'FAIL'} (hit={hit}, compliant={compliant})")
        lines.append("")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"pass_rate={rate:.2%} pass={pass_n}/{len(queries)} -> {OUT}")
    for q, top, hit, compliant, ok in results:
        if not ok:
            print(f"FAIL {q['id']} top={top} expect={q['expect_any']}")
    return 0 if rate >= 0.8 else 1


if __name__ == "__main__":
    sys.exit(main())
