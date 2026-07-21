# 选型级收录标准（Inclusion Criteria）

- 日期：2026-07-22
- 状态：生效（目标模式穷尽式扩图）
- 适用范围：`data/domains/*/nodes/*.yaml` 正式节点；候选见 quarantine / 缺口台账

本目录**不是** GitHub 镜像，也**不是**全站爬仓。  
「一个不差」仅指：在已开领域内，对符合本标准的**选型级**项目不漏录；达不到标准的进缺口台账，不硬塞。

## 1. 何谓「选型级」

同时满足：

1. **可指向的上游**：有稳定、公开的源码托管（优先 GitHub；GitLab/官方自托管可收录，但 `repo` 必须可 HTTP 打开）。
2. **解决可陈述的选型问题**：能用一句话说清「谁在什么约束下会选它」，且能写出对立的 `avoid_when`。
3. **处于本站已开领域**（见 `schema/ontology.yaml` / `docs/index.md` 领域列表）；跨领域项目只进**主领域**一条，其它域用边表达。
4. **有可核验的许可证信号**：正式入库时 `license` 为 SPDX 表达式或已文档化的 `LicenseRef-*`；一时无法核验则 `verification_status=needs_review` 并写 `quality_notes`，不得空着假装已核验。
5. **维护可陈述**：`status` ∈ `active` | `maintenance` | `archived`（规则见 ontology）；归档项目仅在仍常被拿来对比时保留。

不要求：高 star、商业背书、完整 monorepo、本站作者用过。

## 2. 正式节点必填字段

与 `schema/ontology.yaml` / `validate_graph.py` 一致，缺一不可：

| 字段 | 要求 |
|---|---|
| `id` | 稳定短 id，等于文件名 stem |
| `name` | 人读名 |
| `repo` | `http(s)://` 上游地址 |
| `summary` | ≥1 句，说明是什么 |
| `tags` | 非空列表，尽量复用词汇表 |
| `status` | `active` / `maintenance` / `archived` |
| `use_when` | 适用场景（选型正向） |
| `avoid_when` | 不适用场景（选型反向） |

强烈建议同期填写：`language`、`license`、`niche`、`related_ecosystem`、`source_updated_at`、`verified_at`、`verification_status`。  
`homepage`：有独立官网则填；仅有仓库页可留空。

## 3. 关系期望

- 新节点入库后：至少一条边（`alternative_to` / `depends_on` / `integrates_with` / `same_ecosystem` / `supersedes`），**或**在缺口台账写明「暂无合适对端、待补边」。
- 禁止制造无语义的自环或重复边。

## 4. 拒绝收录（直接不进正式节点）

| 拒绝原因 | 说明 |
|---|---|
| 无法公开访问源码 | 纯闭源、仅二进制分发且无源码仓 |
| 无法写清 use/avoid | 广告页、作业玩具、无文档空壳 |
| 领域外且无意开域 | 例如与 19 域均无关的个人博客主题 |
| 恶意/违法/明显供应链骗局 | 不收录、不台账推广 |
| 重复条目 | 已有节点覆盖同一上游；应合并或改边，不双开 |
| 仅镜像/fork 无独立选型价值 | 除非 fork 已成为事实标准且上游死亡 |
| 无法核验且拒绝 `needs_review` | 连残差台账都不愿进的，不占正式位 |

达不到「选型级」但值得跟踪的 → **缺口台账**（应有 / 暂缓 / 不收录+原因），不进 `nodes/`。

## 5. 缺口台账字段（最低）

每条至少：`domain`、`name_or_query`、`reason`（missing / deferred / rejected）、`evidence`（参照源 URL）、`reviewed_at`。

## 6. 扩图流程（摘要）

1. 对照本标准与领域 taxonomy / 外部参照（awesome 列表、官方生态名录等）列缺口。  
2. 候选入 quarantine（或等价暂存）。  
3. 字段与许可证核验通过 → 正式 `nodes/` + `_index.yaml` + 边或台账说明。  
4. `validate_graph` + 检索评测回归后再合并发布。

## 7. 明确不做

- 爬取或镜像整个 GitHub。  
- 按 star/fork 机械排名或灌水。  
- 无证据把 `verification_status` 标成 verified。
