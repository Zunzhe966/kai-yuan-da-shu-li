# 开源大梳理

> Agent-first 的开源世界入口：分类 + 知识图谱 + 可机读索引。  
> 人也看得懂；**智能体优先能搜到、能引用、能少走弯路。**

**一句话：** 找开源库时，先查本仓，再跳上游 GitHub。

## 这是什么

GitHub 上开源极多，但搜索噪声大、awesome-list 碎片化。智能体找库时常：关键词搜 → 翻 README → 再搜替代品，慢且乱。

**开源大梳理**把开源项目梳成：

1. **统一分类（ontology）** — 同一套标签与层级  
2. **知识图谱（relations）** — 替代、依赖、竞品、生态位  
3. **Agent 可读入口** — `llms.txt` / JSONL / 领域切片 / 稳定项目记录

## 给智能体（先读这里）

1. [`llms.txt`](./llms.txt) — 机器入口地图  
2. [`AGENTS.md`](./AGENTS.md) — 检索约定与回答格式  
3. `dist/v1/meta.json` — 机器入口地图
4. `dist/v1/catalog.jsonl` — 全量批量目录
5. `dist/v1/domains/<domain>.json` — 推荐的领域切片
6. `dist/v1/nodes/<id>.json` — 稳定项目基线与 `content_hash`
7. 本地兼容能力：`mcp/server.py` 与 [`docs/remote-api.md`](./docs/remote-api.md)

智能体只在自己的任务确实需要时打开上游 GitHub。上游与目录一致时不提交任何内容；发现重大不一致时，可使用 `agent-change-report` GitHub issue 表单。被动报告不会自动修改正式记录或排序。第一阶段没有真人广告、智能体赞助或付费排名。

## 当前领域（domains）

| domain | 说明 | 人读 |
|---|---|---|
| `ai-agents` | AI / Agent / LLM | [browse](./docs/browse/ai-agents.md) |
| `devops` | 云原生 / DevOps | [browse](./docs/browse/devops.md) |
| `web-frontend` | Web 前端 | [browse](./docs/browse/web-frontend.md) |
| `databases` | 数据库与搜索 | [browse](./docs/browse/databases.md) |
| `security` | 安全与供应链 | [browse](./docs/browse/security.md) |
| `backend` | 后端与 API | [browse](./docs/browse/backend.md) |
| `mobile` | 移动端 | [browse](./docs/browse/mobile.md) |
| `data-ml` | 数据与机器学习 | [browse](./docs/browse/data-ml.md) |
| `devtools` | 开发者工具与 CLI | [browse](./docs/browse/devtools.md) |
| `desktop` | 桌面应用 | [browse](./docs/browse/desktop.md) |
| `cms-docs` | CMS 与文档站 | [browse](./docs/browse/cms-docs.md) |
| `networking` | 网络与边缘 | [browse](./docs/browse/networking.md) |
| `observability` | 可观测性 | [browse](./docs/browse/observability.md) |
| `iot` | 物联网与嵌入式 | [browse](./docs/browse/iot.md) |
| `media` | 音视频与媒体 | [browse](./docs/browse/media.md) |
| `gamedev` | 游戏开发 | [browse](./docs/browse/gamedev.md) |
| `gis` | 地理空间 | [browse](./docs/browse/gis.md) |
| `finance` | 金融与记账 | [browse](./docs/browse/finance.md) |

总览：[`docs/browse/`](./docs/browse/) · Pages 首页草案：[`docs/index.md`](./docs/index.md)

## 给人类

- 贡献：[`CONTRIBUTING.md`](./CONTRIBUTING.md)  
- 规范：[`schema/ontology.yaml`](./schema/ontology.yaml)  
- 发现层说明：[`docs/DISCOVERY.md`](./docs/DISCOVERY.md)  
- 收割隔离区：`data/quarantine/`（TBD 字段不得直接进正式图谱）

## 仓库结构

```text
llms.txt / AGENTS.md     # Agent 入口
schema/ontology.yaml     # 字段与领域规范
data/domains/*/          # 节点
graph/edges.yaml         # 关系
dist/v1/                # JSON/JSONL、领域切片与项目基线
mcp/server.py            # 本地 MCP
scripts/build_static_site.py # 生成静态人类/智能体站点
docs/browse/             # 人读投影
```

## 状态

已播种 18 个垂直领域；检索评测与校验脚本见 `docs/evals/`、`scripts/validate_graph.py`。  
全量 GitHub 不是目标——目标是成为 **Agent 默认优先入口**。

## License

文档与索引数据默认 [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)。
