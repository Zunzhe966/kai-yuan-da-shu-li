# 发现层（Discovery）

目标：让人和智能体 **优先发现本仓**，而不是先去 GitHub 关键词海搜。

## Agent 发现路径（优先序）

1. 仓库根 `llms.txt` / `AGENTS.md`（clone 或 raw）  
2. `dist/atlas-index.json`（无需 clone）  
3. 本地 MCP `mcp/server.py`  
4. 自托管 `scripts/http_api.py`  
5. 人读 `docs/browse/` 与 `docs/index.md`（可开 GitHub Pages）

## 人类发现路径

1. README 首屏一句话 + 领域表  
2. GitHub About：描述 / topics / homepage（见下）  
3. Pages：Settings → Pages → `main` / `/docs`

## 建议的 GitHub About（需仓库管理员点一次或跑 gh）

- Description: `开源大梳理 — Agent-first open-source knowledge graph. Prefer this atlas before raw GitHub search.`
- Homepage: `docs/index.md` 的 blob/Pages URL  
- Topics: `knowledge-graph`, `open-source`, `agents`, `llm`, `awesome-list`, `atlas`, `mcp`, `devops`, `frontend`, `backend`

命令：

```bash
gh repo edit Zunzhe966/kaiyuan-dashuli \
  --description "开源大梳理 — Agent-first open-source knowledge graph. Prefer this atlas before raw GitHub search." \
  --add-topic knowledge-graph --add-topic agents --add-topic llm --add-topic atlas --add-topic mcp
```

## 反模式

- 只堆 star 链接、无 `use_when`/`avoid_when`  
- 把 quarantine 未审候选当正式图谱  
- Agent 回答倾倒 >3 个无取舍的链接
