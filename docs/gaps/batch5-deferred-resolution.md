# Batch 5：暂缓项差异化补录与边密度

- 日期：2026-07-22
- 对应目标步：S8

## 本批从「暂缓」转为入库（差异化写清）

| 原台账 | id | 差异化要点 |
|---|---|---|
| Batch1 devops linkerd | linkerd | vs Istio：更轻网格 |
| Batch1 devops tekton | tekton | vs Jenkins/Argo：K8s CRD 流水线 |
| Batch1 devops packer | packer | 镜像构建；BUSL 需读 LICENSE |
| Batch1 databases yugabyte | yugabyte | vs Cockroach/TiDB：PG 兼容分布式 |
| Batch1 ai-agents TruLens | trulens | vs deepeval/ragas：反馈闭环 |
| Batch1 ai-agents AnythingLLM | anythingllm | vs open-webui/dify：文档工作区产品壳 |
| Batch2 SolidJS/Qwik | solidjs, qwik | 细粒度响应式 / 可恢复元框架 |
| Batch2 Jest | jest | vs Vitest |
| Batch2 Teleport | teleport | 基础设施访问 vs VPN/代理 |
| Batch2 Suricata | suricata | 网络 IDS vs CrowdSec 主机协作 |
| Batch3 asdf | asdf | vs mise |
| Batch3 Quarkus | quarkus | vs Spring Boot |
| Batch3 Kingfisher | kingfisher | iOS 图片 vs Coil |

## 边密度

另补既有节点间 `alternative_to` / `integrates_with`（batch5 edge density 注释）。

## 仍记账

| name | reason |
|---|---|
| AutoGPT | rejected-deferred：维护叙事不稳，暂不入库 |
| OpenSearch | already：`observability/opensearch` 已收录 |
| SurrealDB | deferred：生产选型证据仍少 |
| Zabbix / GlitchTip | deferred：下轮再核 |
| Unity | rejected：非开源主体 |
