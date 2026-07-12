"""Atlas graph helpers shared by validators, eval, and MCP."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DOMAIN = "ai-agents"


def list_domains() -> list[str]:
    base = ROOT / "data/domains"
    return sorted(p.name for p in base.iterdir() if p.is_dir() and not p.name.startswith("_"))


def domain_nodes_dir(domain: str = DEFAULT_DOMAIN) -> Path:
    return ROOT / "data/domains" / domain / "nodes"


def edges_path() -> Path:
    return ROOT / "graph/edges.yaml"


def load_nodes(domain: str | None = DEFAULT_DOMAIN) -> dict[str, dict[str, str]]:
    """Load nodes. domain=None loads all domains (id must be unique globally)."""
    nodes: dict[str, dict[str, str]] = {}
    domains = list_domains() if domain is None else [domain]
    for d in domains:
        for path in domain_nodes_dir(d).glob("*.yaml"):
            fields: dict[str, str] = {}
            for line in path.read_text(encoding="utf-8").splitlines():
                if ":" in line and not line.startswith(" "):
                    k, v = line.split(":", 1)
                    fields[k.strip()] = v.strip()
            tags = fields.get("tags", "").strip("[]")
            fields["tag_list"] = [t.strip() for t in tags.split(",") if t.strip()]
            fields["domain"] = d
            if path.stem in nodes:
                raise ValueError(f"duplicate node id across domains: {path.stem}")
            nodes[path.stem] = fields
    return nodes


def load_edges() -> list[dict[str, str]]:
    edges: list[dict[str, str]] = []
    cur: dict[str, str] | None = None
    for line in edges_path().read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s+-\s+from:\s*(\S+)", line)
        if m:
            if cur:
                edges.append(cur)
            cur = {"from": m.group(1)}
            continue
        if cur is None:
            continue
        m = re.match(r"\s+type:\s*(\S+)", line)
        if m:
            cur["type"] = m.group(1)
        m = re.match(r"\s+to:\s*(\S+)", line)
        if m:
            cur["to"] = m.group(1)
        m = re.match(r"\s+note:\s*(.*)", line)
        if m:
            cur["note"] = m.group(1).strip()
    if cur:
        edges.append(cur)
    return edges


def _score(query: str, intent_tags: set[str], nid: str, n: dict[str, str]) -> float:
    tags = set(n.get("tag_list", []))
    s = float(len(intent_tags & tags)) * 2
    use = n.get("use_when", "").lower()
    avoid = n.get("avoid_when", "").lower()
    blob = " ".join(
        [n.get("summary", ""), use, n.get("name", ""), n.get("niche", "")]
    ).lower()
    for token in re.findall(r"[\w/]+", query.lower()):
        if len(token) < 2:
            continue
        if token in use:
            s += 1.5
        if token in blob:
            s += 0.3
        if token in avoid:
            s -= 1.0
    if "笔记本" in query or "一键" in query:
        if nid in ("ollama", "open-webui", "llama-cpp"):
            s += 3
        if nid in ("vllm", "sglang", "milvus"):
            s -= 3
    if "高并发" in query or "GPU 服务器" in query:
        if nid in ("vllm", "sglang"):
            s += 3
        if nid == "ollama":
            s -= 2
    if "不要重型" in query and nid in ("instructor", "pydantic-ai", "outlines"):
        s += 1
    if "GitOps" in query or "gitops" in query.lower():
        if nid in ("argo-cd", "flux2"):
            s += 3
    if "满血" in query or "轻量" in query:
        if nid == "nomad":
            s += 3
        if nid == "kubernetes" and ("满血" in query or "不想" in query):
            s -= 2
    if "Python/TS" in query or "通用语言" in query:
        if nid == "pulumi":
            s += 3
    if "原型" in query or "快速" in query:
        if nid in ("chromadb", "lancedb", "ollama"):
            s += 2.5
        if nid in ("milvus", "weaviate") and "原型" in query:
            s -= 2
    if "SSR" in query or "文件系统路由" in query:
        if nid in ("nextjs", "remix", "nuxt"):
            s += 3
    if "现代打包" in query or "快速本地开发" in query:
        if nid == "vite":
            s += 3
        if nid == "webpack":
            s -= 1
    if "端到端" in query or "E2E" in query or "多浏览器" in query:
        if nid in ("playwright", "cypress"):
            s += 3
    if "嵌入式" in query and "SQL" in query:
        if nid == "sqlite": s += 3
    if "缓存" in query:
        if nid in ("redis", "keydb"): s += 3
    if "分析" in query and ("明细" in query or "OLAP" in query or "事件" in query):
        if nid in ("clickhouse", "duckdb"): s += 3
    if "密钥泄漏" in query or "secret" in query.lower():
        if nid == "gitleaks": s += 3
    if "容器" in query and "漏洞" in query:
        if nid in ("trivy", "grype"): s += 3
    if "SBOM" in query:
        if nid in ("syft", "grype"): s += 3
    if "Python" in query and "API" in query:
        if nid in ("fastapi", "flask", "django"): s += 2
        if nid == "fastapi" and ("类型" in query or "OpenAPI" in query or "友好" in query): s += 2
    if "任务队列" in query or "后台任务" in query:
        if nid in ("celery", "bullmq"): s += 3
    if "企业级" in query and ("Node" in query or "TypeScript" in query):
        if nid == "nestjs": s += 3
    if "跨平台" in query or "一套代码" in query:
        if nid in ("flutter", "react-native", "expo"): s += 3
    if "React Native" in query or "RN " in query:
        if nid in ("react-native", "expo", "detox"): s += 2
    if "移动" in query and "自动化" in query:
        if nid in ("appium", "detox"): s += 3
    return s


def search_projects(
    query: str,
    tags: list[str] | None = None,
    domain: str | None = DEFAULT_DOMAIN,
    limit: int = 3,
) -> list[dict]:
    nodes = load_nodes(None if domain in (None, "", "all") else domain)
    edges = load_edges()
    intent = set(tags or [])
    if not intent:
        cues = {
            "多 agent": "multi-agent",
            "rag": "rag",
            "向量": "vector-db",
            "mcp": "mcp",
            "本地": "local-llm",
            "评测": "eval",
            "观测": "observability",
            "提示": "prompt",
            "微调": "fine-tuning",
            "容器": "containers",
            "k8s": "orchestration",
            "kubernetes": "orchestration",
            "terraform": "iac",
            "ci": "ci",
            "devops": "devops",
            "前端": "web",
            "react": "react",
            "ssr": "meta-framework",
            "e2e": "testing",
            "数据库": "sql",
            "缓存": "cache",
            "搜索引擎": "search",
            "漏洞": "scanning",
            "密钥": "secrets",
            "SBOM": "sbom",
            "后端": "api",
            "任务队列": "queue",
            "跨平台": "cross-platform",
            "移动端": "mobile",
        }
        ql = query.lower()
        for k, v in cues.items():
            if k in ql:
                intent.add(v)
    scored: list[tuple[float, str]] = []
    for nid, n in nodes.items():
        if tags:
            if not (set(tags) & set(n.get("tag_list", []))):
                continue
        s = _score(query, intent, nid, n)
        if s > 0:
            scored.append((s, nid))
    scored.sort(reverse=True)
    top = [nid for _, nid in scored[: max(limit, 1)]]
    if top:
        for e in edges:
            if e.get("type") == "alternative_to" and top[0] in (e.get("from"), e.get("to")):
                other = e["to"] if e["from"] == top[0] else e["from"]
                if other not in top and other in nodes:
                    top.append(other)
        top = top[:limit]
    score_map = {nid: s for s, nid in scored}
    out = []
    for nid in top:
        n = nodes[nid]
        out.append(
            {
                "id": nid,
                "domain": n.get("domain"),
                "name": n.get("name"),
                "repo": n.get("repo"),
                "summary": n.get("summary"),
                "use_when": n.get("use_when"),
                "avoid_when": n.get("avoid_when"),
                "score": round(score_map.get(nid, 0.0), 3),
            }
        )
    return out


def get_alternatives(node_id: str, limit: int = 5) -> list[dict]:
    nodes = load_nodes(None)
    if node_id not in nodes:
        return []
    edges = load_edges()
    out = []
    for e in edges:
        if e.get("type") not in {"alternative_to", "supersedes"}:
            continue
        if node_id not in (e.get("from"), e.get("to")):
            continue
        other = e["to"] if e["from"] == node_id else e["from"]
        if other not in nodes:
            continue
        n = nodes[other]
        out.append(
            {
                "id": other,
                "domain": n.get("domain"),
                "name": n.get("name"),
                "repo": n.get("repo"),
                "summary": n.get("summary"),
                "use_when": n.get("use_when"),
                "avoid_when": n.get("avoid_when"),
                "edge_type": e.get("type"),
                "note": e.get("note", ""),
            }
        )
        if len(out) >= limit:
            break
    return out


def get_node(node_id: str) -> dict | None:
    nodes = load_nodes(None)
    n = nodes.get(node_id)
    if not n:
        return None
    edges = []
    for e in load_edges():
        if node_id == e.get("from"):
            edges.append(
                {
                    "type": e.get("type"),
                    "direction": "out",
                    "other_id": e.get("to"),
                    "note": e.get("note", ""),
                }
            )
        elif node_id == e.get("to"):
            edges.append(
                {
                    "type": e.get("type"),
                    "direction": "in",
                    "other_id": e.get("from"),
                    "note": e.get("note", ""),
                }
            )
    payload = {k: v for k, v in n.items() if k != "tag_list"}
    payload["id"] = node_id
    payload["edges"] = edges
    return payload
