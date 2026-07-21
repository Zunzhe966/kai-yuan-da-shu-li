# Batch 1 缺口表（ai-agents / devops / databases）

- 日期：2026-07-22
- 参照：[`batch1-reference-sources.md`](./batch1-reference-sources.md)
- 标准：[`../inclusion-criteria.md`](../inclusion-criteria.md)

## 已补录（本批入库）

| domain | id | reason_was | action |
|---|---|---|---|
| ai-agents | dify | missing 产品化 LLM 工作台 | added |
| ai-agents | localai | missing OpenAI 兼容本地引擎品类 | added |
| ai-agents | promptfoo | missing 提示词/红队评测工具 | added |
| devops | k3s | missing 轻量 K8s 发行版 | added |
| devops | cert-manager | missing 集群证书刚需 | added |
| devops | jenkins | missing 经典自托管 CI | added |
| devops | harbor | missing 可信制品仓库 | added |
| databases | valkey | missing Redis 兼容社区分叉 | added |
| databases | timescaledb | missing Postgres 时序扩展品类 | added |
| databases | pgvector | missing 库内向量检索 | added |

## 仍缺 / 暂缓（记账，不硬塞）

| domain | name_or_query | reason | evidence | reviewed_at |
|---|---|---|---|---|
| ai-agents | AutoGPT | deferred：维护叙事分裂，选型价值不稳定 | awesome-llm 常见提及 | 2026-07-22 |
| ai-agents | AnythingLLM | deferred：待核验许可与和 open-webui 差异 | 产品站/GitHub | 2026-07-22 |
| ai-agents | TruLens | deferred：与 phoenix/deepeval 重叠，下轮对比后再定 | eval 生态 | 2026-07-22 |
| devops | linkerd | deferred：service mesh 已有 Istio，下轮做替代边对 | CNCF landscape | 2026-07-22 |
| devops | tekton | deferred：K8s native CI，下轮与 Jenkins/Argo 对照 | CNCF | 2026-07-22 |
| devops | packer | deferred：镜像构建品类，非本批最高优先级 | Hashi 生态 | 2026-07-22 |
| databases | yugabyte-db | deferred：分布式 SQL 已有 cockroach/tidb，下轮差异化再录 | DB 品类 | 2026-07-22 |
| databases | OpenSearch | deferred：搜索/观测交叉，归属域待定 | AWS/OS 生态 | 2026-07-22 |
| databases | SurrealDB | deferred：多模型新库，生产选型证据仍少 | awesome-db | 2026-07-22 |

## 明确不收录

| domain | name | reason |
|---|---|---|
| * | 纯闭源托管库（无源码选型价值） | rejected：inclusion-criteria §4 |
| * | awesome 列表整表导入 | rejected：禁止灌水 |
