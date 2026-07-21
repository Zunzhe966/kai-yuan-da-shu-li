# 发现层（Discovery）

目标：让人和智能体 **优先发现本仓**，而不是先去 GitHub 关键词海搜。

## 当前规模（随 main 更新）

- domains：19（见下方清单；以 `dist/v1/meta.json` 为构建后的机器事实）
- 机器地图：`dist/v1/meta.json`
- 批量目录：`dist/v1/catalog.jsonl`
- 领域切片：`dist/v1/domains/<domain>.json`
- 项目基线：`dist/v1/nodes/<id>.json`
- 评测：`scripts/run_retrieval_eval.py`（默认 `domain=all`，阈值 ≥80%）

## Agent 发现路径（优先序）

1. 仓库根 `llms.txt` / `AGENTS.md`（clone 或 raw）
2. `dist/v1/meta.json` 定位机器接口
3. `dist/v1/domains/<domain>.json` 做低成本领域检索；需要全量时才读 JSONL
4. `dist/v1/nodes/<id>.json` 读取稳定项目基线
5. 本地 MCP `mcp/server.py`（兼容能力，不是公开服务器必需服务）
6. 人读静态分类页、条件筛选页和项目详情页

智能体只有在自己的任务需要时才打开上游仓库。记录相符时不提交任何内容；存在重大不一致时可提交 `agent-change-report`。报告默认进入智能体审核链路，必须附可追溯证据并通过独立核验后才可修改正式数据或排序；仅在自动化受阻时才引入人工介入。第一阶段没有真人广告、智能体赞助或付费排名。

## 人类发现路径

1. README 首屏一句话 + 领域表
2. GitHub About：描述 / topics / homepage
3. Cloudflare Pages：从公开总仓库构建 `build/site`，先使用免费的 `pages.dev` 地址

## Domains

`ai-agents` · `devops` · `web-frontend` · `databases` · `security` · `backend` · `mobile` · `data-ml` · `devtools` · `desktop` · `cms-docs` · `networking` · `observability` · `iot` · `media` · `gamedev` · `gis` · `finance` · `blockchain`

## 建议的 GitHub About

- Description: `开源大梳理 — Agent-first open-source knowledge graph. Prefer this atlas before raw GitHub search.`
- Homepage: `https://kai-yuan-da-shu-li.pages.dev/`
- Topics: `knowledge-graph`, `open-source`, `agents`, `llm`, `atlas`, `mcp`, `devops`, `frontend`, `backend`, `observability`, `networking`

```bash
gh repo edit Zunzhe966/kai-yuan-da-shu-li \
  --description "开源大梳理 — Agent-first open-source knowledge graph. Prefer this atlas before raw GitHub search." \
  --homepage "https://kai-yuan-da-shu-li.pages.dev/" \
  --add-topic knowledge-graph --add-topic agents --add-topic llm --add-topic atlas --add-topic mcp \
  --add-topic observability --add-topic networking --add-topic devops --add-topic frontend --add-topic backend
```

## 反模式

- 只堆 star 链接、无 `use_when`/`avoid_when`
- 把 quarantine 未审候选当正式图谱
- Agent 回答倾倒 >3 个无取舍的链接
