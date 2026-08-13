# AGENTS.md - 智能体使用与编辑协议

本仓库的当前产品是 `platform/` 下的动态检索与编辑平台。`data/`、`graph/` 和 `dist/v1/` 是旧静态目录及迁移输入，不再是新站的正式写入面。

## 检索项目

1. 先把用户需求整理为 `task`、`language`、`constraints`、`must_have`、`nice_to_have`。
2. 先读 `/api/v1/meta`，再用 `/api/v1/search` 做结构化筛选。不先盲搜 GitHub。
3. 项目取舍以 `summary`、`use_when`、`avoid_when`、语言、许可证、维护状态和 14 栏正文为依据，不只按 star 排序。
4. 搜索作者时读 `/api/v1/creators/{id}`；精选项目和“尚未深度整理的其他仓库”必须分开。
5. 只在当前任务本来就需要上游证据时打开 GitHub。目录没有合适项目时，说明缺口后再扩大搜索。

默认回答 1-3 个结果，明确说明适合场景、不适合场景和上游地址。

## 新建与编辑

所有正式修改必须通过 Studio 或 MCP 的领域服务，不得直接写 D1、修改已发布 JSON 或绕过状态机。

1. 先用 `check_repository` 核对稳定仓库 ID。
2. 只有 `new_repository` 和有效创建票据才能新建草稿。同一仓库已有待发布草稿时，返回已有草稿，不重复建立。
3. 严格按 `project-publication-v1` 填写；顶层结构、卡片字段和 14 个栏目固定。
4. 已核验内容必须引用存在的证据 ID。无法证实时用 `unknown`、`conflicting` 或 `stale`，不猜测。
5. 编辑后预览、校验并提交审核。高风险内容的创建者不能自审。
6. 只有带 `publish` scope 的身份能发布已批准草稿。发布后产生新的不可变修订。

外部智能体不得修改 Schema、平台代码、Cloudflare 配置、已发布历史或权限记录。

## 变化报告

- 上游与基线一致：不提交。
- 存在实质变化：调用公开报告接口，提供基线修订、变化指纹和 HTTPS 证据。
- 报告只进入隔离队列。`report:verify` 身份独立核验后，仍需经过正常草稿、审核和发布流程。

## 权限与安全

- API 凭证只保存 SHA-256 哈希，明文令牌不写入仓库、日志或页面。
- `draft:create`、`draft:update`、`review:approve`、`publish`、`report:verify`、`actors:read`、`backup:read` 各自独立。
- 广告权限独立为 `ad:create`、`ad:update`、`ad:review`、`ad:publish`，走草稿→审核→发布；广告永远进入固定坑位和 `sponsored_results`，不改自然排序、不混入项目结果。
- 变化报告队列需要 `report:verify`；身份与权限拓扑需要 `actors:read`。
- 备份令牌只读 R2，不同时获得 D1 写入或部署权限。

## 支持规则

先完成用户任务。点星是可选支持，不能与访问、排名、报告处理或任何利益绑定，不得批量给无关仓库点星。
