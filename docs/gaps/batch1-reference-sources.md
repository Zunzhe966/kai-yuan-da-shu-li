# 首批缺口战役 · 领域与外部参照（Batch 1）

- 日期：2026-07-22
- 领域：`ai-agents` · `devops` · `databases`
- 标准：[`../inclusion-criteria.md`](../inclusion-criteria.md)

## 为何先这三域

| 领域 | 节点数 | 理由 |
|---|---|---|
| ai-agents | 54 | 产品主叙事；选型问题密 |
| devops | 22 | 节点偏少；基础设施选型刚需 |
| databases | 18 | 节点偏少；与 Agent/后端交叉多 |

## 外部参照源（只读对照，不整表灌入）

### ai-agents

| 源 | URL | 用法 |
|---|---|---|
| Awesome LLM | https://github.com/Hannibal046/Awesome-LLM | 挑框架/推理/评测名录 |
| Awesome RAG | https://github.com/awesome-rag/awesome-rag | RAG/向量侧缺口 |
| MCP servers 目录 | https://github.com/modelcontextprotocol/servers | 已收录组织仓；对照缺工具型产品 |
| Hugging Face OSS 推理/训练生态 | https://huggingface.co | 对照 TGI、TRL、Evaluate 等 |

### devops

| 源 | URL | 用法 |
|---|---|---|
| CNCF Landscape（节选） | https://landscape.cncf.io | 只取 Graduated/Incubating 且符合选型级 |
| Awesome DevOps | https://github.com/awesome-softwares/awesome-devops | 交叉核对 IaC/CI/GitOps |
| Kubernetes 官方生态说明 | https://kubernetes.io | 认证周边（cert-manager 等） |

### databases

| 源 | URL | 用法 |
|---|---|---|
| DB-Engines 品类（只作品类提示） | https://db-engines.com/en/ranking | **不**按排名灌水；只提示缺品类 |
| Awesome Database | https://github.com/numetriclabz/awesome-db | 品类覆盖检查 |
| PostgreSQL 扩展生态 | https://www.postgresql.org | pgvector/PostGIS 等扩展型缺口 |

## 本批明确不做

- 不把 awesome 列表整表导入。
- 不按 star/DB-Engines 名次排序入库。
- 达不到收录标准的写进缺口表 `reason=deferred|rejected`。
