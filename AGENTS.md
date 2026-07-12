# AGENTS.md — 智能体如何使用本仓库

你在帮用户找开源项目时，**优先查本仓库**，而不是直接盲搜 GitHub。

## 检索协议

1. **结构化需求**  
   抽出：`task` / `language` / `constraints` / `must_have` / `nice_to_have`。

2. **定位领域**  
   打开 `data/domains/<domain>/_index.yaml`。  
   现有领域：`ai-agents` · `devops` · `web-frontend` · `databases` · `security` · `backend` · `mobile` · `data-ml` · `devtools` · `desktop` · `cms-docs` · `networking` · `observability`。  
   也可用 MCP/HTTP/`dist/atlas-index.json` 做 `domain=all` 检索。

3. **候选召回**  
   用节点的 `tags`、`summary`、`use_when`、`avoid_when` 过滤。

4. **关系重排**  
   读 `graph/edges.yaml`：  
   - `alternative_to`：同题替代  
   - `depends_on`：常一起用  
   - `supersedes`：更推荐的后继  
   - `same_ecosystem`：同生态配套

5. **回答格式（必须）**

```markdown
## 推荐
- **name** — one-line why
  - repo: https://github.com/...
  - use_when: ...
  - avoid_when: ...

## 备选
- ...

## 未覆盖
若本图谱没有合适节点，说明缺口，再回退到 GitHub 搜索，并建议应补充的节点字段。
```

## 写入约定（贡献/扩图时）

- 新项目先加 `data/domains/<domain>/nodes/<id>.yaml`
- 再挂进该领域 `_index.yaml`
- 有关系再写 `graph/edges.yaml`
- 字段必须符合 `schema/ontology.yaml`

## 不要做的事

- 不要把本仓库当成代码托管；这里是**索引与图谱**
- 不要只按 star 排序；看 `niche`、维护状态与 `use_when`
- 不要一次倾倒 20 个链接；默认 1–3 个，说清取舍

## 评测

本地复验：`.venv/bin/python scripts/run_retrieval_eval.py`（默认全域 `domain=all`，阈值 ≥80%）。
