# 开源项目发现与推广平台设计

- 日期：2026-08-02
- 状态：已完成产品讨论，待用户复核书面规格
- 替代方向：旧版“开源知识图谱目录”和仅本地维护的静态 Pages 方案
- 第一生产目标：完成新版、验证后替换 `kai-yuan-da-shu-li.pages.dev` 的旧内容，再绑定自有域名

## 1. 产品定义

“开源大梳理”是一个由内部智能体编辑部持续维护、同时服务真人和智能体的开源项目搜索、介绍、查重与推广平台。

平台不托管第三方项目源码，不替代 GitHub、GitLab、Gitee 或 Codeberg，也不以外部项目作者注册和维护页面为成立条件。项目源码、发行包和正式文档继续位于上游平台；本站保存项目结构化资料、固定栏目介绍、作者与组织资料、证据、历史版本和外部链接。

产品体验借鉴小说或影视分类站的内容组织方式：分类页负责发现，项目卡片负责快速判断，项目详情页负责深入阅读，作者或组织页聚合其公开项目。这个类比只用于信息架构，不意味着建设小说社区、评论社区或开放作者注册系统。

平台长期可通过真人网页广告、明确标注的赞助位和项目推广服务获得收入。自然搜索、事实字段、编辑结论和自然推荐不得因付费改变。

## 2. 核心决策

1. 项目与作者/组织是两个并列的一等搜索对象。
2. 搜索、分类、条件筛选和项目详情是主要发现方式；关系图谱不再是核心产品或必填数据。
3. 平台只有一个内部“编辑控制台”，不建设面向外部项目作者的开放注册中心。
4. 用户、Codex 和其他受信任智能体通过不同凭证进入同一控制面，并按最小权限工作。
5. 外部真人和普通智能体可以搜索、读取和报告变化，但不能直接编辑正式数据。
6. 所有项目使用同一个严格模板。允许在固定栏目内写深入分析，不允许不同智能体自行创造不同结构。
7. D1 是正式内容与版本数据库；GitHub 私有仓库是自动备份、审计和可读快照，不是日常内容后台。
8. Cloudflare Dashboard 只用于一次性基础设施配置和程序升级，日常新增、编辑、审核和发布全部在自有平台完成。
9. 正式项目不硬删除；使用归档、撤回修订和恢复历史版本处理错误与失效。
10. 当前脏工作树和旧站不能直接部署。新版在隔离环境完成迁移与验收后再切换生产。

## 3. 非目标

第一版明确不做：

- 托管或镜像第三方项目源码；
- 让外部项目作者注册并直接维护页面；
- 评论、论坛、私信、关注、收藏和动态流；
- 以可视化关系图作为首页或搜索核心；
- 按 Star 机械决定收录、质量或默认排序；
- 让外部输入直接修改 D1 正式修订、网站程序或 Cloudflare 部署；
- 一开始覆盖所有代码托管平台和全部公开仓库；
- 在真实流量、主体和合规条件未确认前接入真实广告收款。

## 4. 使用者与权限

### 4.1 公开访问者

公开真人和智能体无需账号即可搜索项目与作者、读取详情、下载公开快照，并提交低风险变化报告。报告只能进入隔离队列。

### 4.2 平台所有者

平台所有者管理规则、智能体凭证、高风险审核、正式发布、撤回、恢复、广告和生产配置。所有者是最终控制者。

### 4.3 受信任智能体

每个智能体使用独立身份和可撤销凭证，例如 `agent:project-researcher`、`agent:content-editor`、`agent:change-verifier`。凭证按能力授权，不共用管理员密钥。

建议能力域：

```text
catalog:read
draft:create
draft:update
evidence:add
creator:update
review:submit
review:verify
release:approve
```

远程智能体不获得 Schema 修改、程序修改、任意 SQL、正式删除和 Cloudflare 部署能力。`release:approve` 默认只授予所有者或单独的内部发布身份，不作为公共 MCP 工具开放。

### 4.4 外部项目作者

外部作者、公司、基金会和社区是被介绍的内容实体，不是本站账号。他们可通过公开纠错入口提交证据；平台独立核验。未来若真实需求足够强，可以增加有限认领，但不属于当前系统，也不能成为内容更新的依赖。

## 5. 总体架构

```text
真人公开网站 ─┐
              ├→ 统一查询服务 → D1 正式项目/作者修订
公开 REST/MCP ─┘

内部编辑控制台 ─┐
受信任 MCP/API  ─┼→ 草稿与审核服务 → 验证 → 发布新修订
变化报告入口    ─┘

D1 正式修订 → 服务端 HTML/API/MCP/搜索索引
            → 定时导出 → R2 备份 + GitHub 私有快照仓库
```

Cloudflare 组件职责：

- Workers：服务端 HTML、REST API、远程 MCP、权限和发布事务；
- D1：项目、作者、固定模板修订、草稿、报告、审核、凭证元数据和审计日志；
- R2：Logo、截图、导出包和数据库备份；第一阶段可只允许外部媒体 URL；
- Queues：异步取证、变化核验、备份和缓存刷新；
- Cron Triggers：每日变化处理与定时快照；
- Turnstile：真人公开报告防垃圾；
- Pages 或 Workers Static Assets：CSS、JavaScript、字体和公共静态资源。

正式内容发布不触发 Cloudflare 项目重新部署。只有程序、Schema 迁移或静态资源发生变化时才部署应用代码。

## 6. 正式数据模型

### 6.1 存储原则

D1 保存不可变的 `project_revision` JSON 和提取后的可查询字段。项目表只指向当前已发布修订；发布事务必须同时完成 Schema 校验、修订写入、当前指针更新和审计事件写入。

主要实体：

```text
projects
project_revisions
project_search_facets
repository_sources
creators
creator_revisions
creator_project_roles
evidence
drafts
submissions
reviews
change_reports
actors
api_credentials
audit_events
backup_runs
```

公开页面、REST、MCP 和备份快照都从同一份已发布修订生成，不维护相互独立的内容副本。

### 6.2 项目稳定身份

内部 `project_id` 永不依赖可变仓库名。每个仓库来源使用 `platform + platform_repository_id` 去重；保留规范 URL、名称历史、转移记录、fork/mirror 状态和观察时间。第一阶段支持 GitHub，数据结构从第一天允许 GitLab、Gitee 和 Codeberg 适配器。

同一个产品可以关联多个仓库来源，但必须明确 `primary`、`component`、`mirror` 或 `archive` 角色。不能因仓库改名或组织转移创建新项目。

## 7. 统一项目模板 `project-publication-v1`

### 7.1 顶层结构

每个新建草稿在送审时必须形成完整对象，禁止模板外字段：

```text
schema_version
project_id
record_state
repository_sources
identity
attribution
discovery
card
sections
evidence
field_states
editorial
publication
```

`additionalProperties` 必须为 `false`。任何模型、网页表单、REST 或 MCP 最终都生成同一结构；网页和字段级工具可以分步骤修改草稿，但送审时必须物化并验证完整模板，不能以局部更新绕过必填栏目。

### 7.2 仓库来源 `repository_sources`

每项必须包含：

- `platform`；
- `platform_repository_id`；
- `canonical_url`；
- `full_name`；
- `role`；
- `visibility`；
- `default_branch` 和已观察 OID；
- `created_at`、`updated_at`、`pushed_at`、`observed_at`；
- `is_fork`、`mirror_url`、`archived`、`disabled`；
- `evidence_ids`。

### 7.3 身份 `identity`

固定字段：

- 原始名称与中文显示名；
- 别名和历史名称；
- 一句话客观定义；
- 官网、文档、演示和下载地址；
- 首次公开时间与当前生命周期；
- Logo 或展示图来源及使用依据。

### 7.4 作者与组织 `attribution`

每项关联独立 `creator_id`，并明确角色：`creator | current_owner | maintainer | organization | foundation | sponsor_of_upstream`。角色必须附证据，不能把仓库当前 owner 自动写成项目最初创建者。

作者/组织实体固定包含：类型、名称、别名、客观简介、官方主页、可核验社交账号、代码托管账号和项目角色。抖音、B站、YouTube、博客等只在官方来源或可信交叉来源确认后展示。

### 7.5 搜索与筛选 `discovery`

固定字段：

- 领域与子分类；
- 解决任务；
- 能力标签；
- 项目类型；
- 编程语言、框架、运行时和协议；
- 交付方式与包格式；
- 操作系统、运行目标、CPU/GPU 要求；
- 自然语言支持；
- 开源性质和许可证；
- 成熟度、维护状态和最新活动时间；
- 搜索别名与规范关键词。

这些字段是筛选和缩小范围的基础，不依赖关系图谱。

### 7.6 卡片 `card`

卡片必须简洁且可比较：

- 名称与中文名；
- 80 字以内客观摘要；
- 适用场景；
- 不适用场景；
- 主要分类、语言、许可证、维护状态；
- 主要作者/组织；
- 核验状态和最后核验时间。

卡片不得放长文、营销词、未经证实的“最好/最强”或付费排名信号。

### 7.7 固定正文栏目 `sections`

所有项目按以下固定顺序拥有栏目：

1. `overview`：项目是什么、解决什么问题；
2. `problem_and_positioning`：目标用户、边界和生态位置；
3. `background_and_history`：诞生背景、关键时间线；
4. `creators_and_organization`：人物、团队、公司或基金会；
5. `design_philosophy`：公开可证的设计理念与取舍；
6. `architecture_and_technology`：架构、语言、组件和关键技术；
7. `core_capabilities`：主要能力及其边界；
8. `installation_and_usage`：安装、最小用法和典型工作流；
9. `limitations_and_risks`：已知限制、安全、许可证和运维风险；
10. `maintenance_and_releases`：维护模式、版本和发布状态；
11. `ecosystem_and_interoperability`：兼容系统、集成和组合方式；
12. `alternatives_and_selection`：同类候选和选择依据；
13. `community_and_channels`：文档、社区、视频和官方公开账号；
14. `editorial_assessment`：本站智能体的综合理解与适用判断。

每个栏目使用同一个子模板：

```text
state: verified | inferred | unknown | conflicting | stale | not_applicable
summary: 简短结论
body: 受限 Markdown 长文
key_points: 结构化要点列表
evidence_ids: 支撑事实的证据
confidence: high | medium | low
updated_at: UTC 时间
```

允许 `body` 写深入分析，但事实陈述必须关联证据；编辑推断必须明确标为 `inferred`，不能伪装成上游声明。缺失内容必须填 `unknown` 并说明缺失原因，不能删除栏目或换成自创标题。

发布最低门槛：`overview`、`problem_and_positioning`、`core_capabilities`、`limitations_and_risks`、卡片 `use_when/avoid_when` 和至少一个一手证据不能是空值。其他栏目允许 `unknown`，但会影响完整度等级。

### 7.8 证据与字段状态

每条证据包含 ID、HTTPS URL、来源类型、取证时间、所支持字段、事实摘要、适用版本和可选内容哈希。证据优先使用仓库 API、固定提交、README、LICENSE、Release、正式文档、安全政策和维护者公告。

每个重要字段必须有 `verified | inferred | unknown | conflicting | stale | not_applicable` 状态。模型不得执行上游代码、不得用 Star 代替质量判断、不得从营销文案推导生产成熟度。

### 7.9 编辑与出版元数据

`editorial` 记录研究智能体、编辑智能体、复核智能体、工作说明和内部备注；它不进入公开正文。`publication` 记录基础修订、草稿状态、审核结论、发布时间、撤回原因和替代修订。

任何修改都必须保存 actor、时间、原因、证据和字段差异。正式修订不可原地覆盖。

## 8. 内部项目工作区

编辑控制台中的每个项目有独立工作区：

```text
基本资料
仓库来源
作者与组织
搜索与筛选
卡片
固定正文栏目
证据
变化报告
版本差异
公开预览
审核与发布
```

状态机：

```text
discovered → duplicate_check → researching → draft
→ in_review → changes_requested → approved → published
→ stale → archived
```

智能体更新时必须提供 `base_revision`。如果正式版本或草稿已变化，系统返回冲突，不允许旧请求静默覆盖。项目不提供硬删除操作。

## 9. 新建、编辑与审核流程

### 9.1 强制查重

新建前必须调用 `check_repository`。服务规范化 URL、读取平台稳定 ID，并返回：

- `existing_project`：已有项目，进入编辑；
- `renamed_or_transferred`：关联原项目；
- `possible_duplicate`：进入复核；
- `new_repository`：签发短期 `creation_ticket`，允许创建草稿。

`create_project_draft` 必须携带 `creation_ticket`，不能绕过查重。

### 9.2 智能体编辑

智能体通过字段级工具编辑，不允许上传任意文件覆盖记录：

```text
create_project_draft
open_project_workspace
update_project_fields
upsert_project_section
link_creator
add_evidence
preview_project
submit_project_for_review
revise_project_draft
get_project_history
```

所有命令支持幂等键。相同智能体重试不会产生重复项目或重复修订。

### 9.3 审核

自动门槛检查 Schema、查重、URL、安全文本、必填栏目、证据引用、版本冲突和搜索字段。之后由独立复核身份处理事实冲突与编辑判断。高风险字段包括许可证、所有权、人物归属、安全声明、重大限制和负面判断。

发布只接受已批准草稿，并通过事务生成新修订。审核者不能审核自己提交的高风险内容。

## 10. 公开 API 与远程 MCP

### 10.1 能力发现

REST 提供 `/openapi.json`，MCP 提供标准工具列表，并额外提供 `get_capabilities`，返回当前身份、scope、Schema 版本、限额、允许动作和审核要求。

### 10.2 公开读取工具

```text
search_projects
get_project
search_creators
get_creator
find_similar_projects
check_repository
get_catalog_meta
```

`find_similar_projects` 使用分类、能力、技术、交付方式和适用条件计算，不依赖手写关系图。

### 10.3 报告与内部写工具

公开低风险工具：

```text
report_project_change
get_public_report_status
```

受信任身份按 scope 获得第 9.2 节的草稿工具和 `verify_change_report`。任何远程 MCP 身份都不直接获得任意 SQL、Schema 修改或部署权限。

## 11. 搜索、筛选与作者聚合

全局搜索同时召回项目和作者/组织，并允许按类型切换。项目筛选至少覆盖领域、能力、用途、语言、许可证、维护状态、项目类型、交付方式、平台和更新时间。不同维度使用 AND，同一维度多选默认 OR，未知值可明确排除或标记包含。

项目默认排序使用文本相关度、筛选匹配、记录完整度、证据新鲜度和维护状态。Star 只可作为显式排序选项；广告和赞助不改变自然排序。

作者页分两层列出项目：

- 本站精选项目：具有完整固定模板和审核修订；
- 其他公开仓库：通过平台 API 发现，只显示基础元数据并标注“尚未深度整理”。

人物、组织、当前 owner、创建者和维护者必须使用显式角色区分。跨平台身份只在官方主页或可信证据明确关联时合并，不能按同名猜测。

## 12. 变化报告与每日更新

普通智能体在自身任务中发现明显差异时，可提交项目 ID、本站基线修订、变化类型、观察值、上游指纹、证据 URL 和观察时间。无变化时不提交。

每日任务：

```text
接收报告 → 按项目/类型/指纹去重 → 读取官方来源
→ 生成字段差异 → 自动风险分类 → 更新或送复核
→ 通知状态 → 备份新修订
```

Star、最近推送和明确 Release 等机械事实可由独立验证任务按规则自动复核，但仍必须生成不可变修订和审计记录。许可证、仓库所有权、项目定位、人物归属、风险和编辑分析必须由独立复核身份处理。报告永远不能直接修改自然排名或正式记录。

## 13. 不再以图谱为核心

新版不要求创建或维护 `graph/edges.yaml` 才能发布项目。替代、集成和组合内容写入固定正文栏目与可筛选字段；相似项目主要从共同分类、能力、技术、平台和适用条件生成。

现有 660 条边暂时作为兼容旧数据冻结，不在首轮迁移中删除，也不继续要求智能体扩边。确认新版搜索与详情达到验收标准后，再单独决定归档或转换其中有证据价值的关系说明。

## 14. 备份、恢复与审计

D1 是唯一在线正式数据源。备份采用三层：

1. D1 平台恢复能力和发布前检查点；
2. 定时导出到 R2 的加密或受控快照；
3. 每日把公开内容 JSONL、Schema、迁移、修订清单和哈希推送到 GitHub 私有备份仓库。

GitHub 机器人只获得目标备份仓库的最小写权限。备份失败不阻止网站读取，但必须告警并重试；连续失败时禁止执行破坏性迁移。

恢复演练必须能够从选定快照重建项目、作者、修订、证据和搜索索引，并验证记录数、哈希和抽样页面。

## 15. 安全边界

- 外部仓库和投稿均视为不可信输入；
- 只接受固定 JSON Schema 和受限 Markdown；
- 禁止脚本、事件属性、危险协议和任意 HTML；
- 限制 URL 域、重定向、响应大小、超时和媒体类型；
- 不执行上游代码、安装命令或构建脚本；
- API Key 只存哈希，可过期、轮换和撤销；
- 读取、投稿、审核、发布和部署使用不同凭证；
- 所有写操作记录审计日志；
- 公开报告使用限速、去重和滥用隔离；
- 敏感资料、Cloudflare 密钥、GitHub 备份密钥和广告资料不进入公开数据。

## 16. 广告与自然结果隔离

第一上线版本可以不启用真实广告，但预留独立广告实体和槽位。广告必须明确标注，具有活动 ID、广告主、有效期、落地页和审核状态。

公开 API/MCP 分开返回 `organic_results` 与 `sponsored_results`。付费不得修改项目事实、完整度、编辑判断、自然排序或隐藏竞争项目。机器流量不能冒充真人广告展示。

## 17. 迁移与上线

### 17.1 迁移原则

当前约 496 个旧节点先导入为 `legacy_imported` 修订，保留原字段和来源，不伪造固定正文栏目。缺失栏目使用 `unknown`，精选完整度与新深度记录明确区分。

现有 `research-dossier-v1` 中经过验证的身份、许可证、技术、平台、生命周期和证据字段映射到新模板；原始 dossier 不直接作为公开文章。

重复仓库按稳定平台 ID 合并。当前工作区的大量未提交修改必须先分组审计，不能整体当作生产迁移包。

### 17.2 分阶段交付

1. 数据与存储基础：新 Schema、D1 迁移、修订模型、旧数据导入器；
2. 公开读取面：项目/作者页、搜索、筛选、REST 和只读 MCP；
3. 内部编辑面：项目工作区、新建、编辑、证据、预览和审核；
4. 更新闭环：变化报告、每日核验、冲突处理和通知；
5. 备份恢复：R2、GitHub 私有快照和恢复演练；
6. 生产切换：预览验收、正式发布、自有域名绑定和旧地址重定向；
7. 商业化准备：隐私、广告披露、统计和独立赞助结果。

### 17.3 生产切换门槛

- 所有正式写入只能通过草稿和审核；
- 项目模板、权限、查重、并发冲突和审计测试通过；
- 人类网页、REST 和 MCP 对同一查询返回同源结果；
- 项目和作者独立 URL 可被抓取，Sitemap、robots 和 llms 入口正确；
- 桌面与移动端搜索、筛选、详情和编辑台通过真实浏览器验收；
- 备份与恢复演练通过；
- 旧数据迁移数量、重复项和未知栏目有明确报告；
- 预览环境连续稳定后才替换旧站；
- 域名购买与绑定由用户在功能验收后执行或明确授权执行。

## 18. 测试策略

### 18.1 数据契约

测试严格模板、未知状态、禁止额外字段、证据引用、稳定身份、重复仓库、作者角色、固定栏目顺序和修订不可变性。

### 18.2 权限与工作流

测试公开身份不能创建草稿、智能体只能使用自己的 scope、审核者不能高风险自审、旧修订不能覆盖新修订、撤回与恢复保留历史、恶意 Markdown 不进入公开 HTML。

### 18.3 查询一致性

使用同一组查询验证网页、REST、MCP 和离线快照的总数、筛选和排序一致；验证无图谱时的相似项目结果仍可解释。

### 18.4 端到端

覆盖查重、新建、编辑固定栏目、添加证据、预览、退回、重新提交、发布、公开读取、变化报告、每日核验、备份和恢复。生产切换前验证线上版本 ID、Schema 版本、数据库修订和备份哈希。

## 19. 完成定义

“完成新版”不是只生成页面或写完代码。必须同时满足：

- 平台按固定模板管理项目；
- 内部智能体能通过受限 MCP/API 新建和编辑草稿；
- 所有写入通过审核并可追溯、可回滚；
- 真人与智能体可以有效搜索、筛选项目和作者；
- 图谱不再是收录和搜索的依赖；
- 日常内容维护无需进入 Cloudflare Dashboard；
- 正式数据有自动备份和恢复证据；
- 新版通过预览验收并替换旧站；
- 自有域名可在功能完成后直接绑定。
