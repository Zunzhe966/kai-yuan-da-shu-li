# Cloudflare Pages 开源大梳理上线计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有开源大梳理公开仓库整理成可由 Cloudflare Pages 发布的低资源网站，并清除过时的搬瓦工展示方案，同时保护中转站和私人资料。

**Architecture:** 当前阶段使用一个公开总仓库 `Zunzhe966/kai-yuan-da-shu-li`，从 YAML 节点生成静态 HTML、JSON、JSONL 和压缩索引。Cloudflare Pages 直接从总仓库构建；未来按领域拆分的公开数据仓库通过版本清单合并，不使用 Git 子模块。私人仓库清单留在私人管理资料中，不进入公开发布包。

**Tech Stack:** Python 3.12 标准库、现有 Python 静态构建器、GitHub Actions、GitHub CLI、Cloudflare Pages Git 集成、静态 HTML/CSS/JavaScript。

---

## 2026-07-19 执行状态

本地实施和验收已经完成，真实外部连接仍停在用户授权闸门：

| 项目 | 状态 | 结果 |
|---|---|---|
| 任务 1-6 | 已完成 | 架构、安全、Cloudflare 发布说明、仓库拓扑、智能体支持规则和广告边界均已提交到隔离分支 |
| 任务 7 | 已完成 | 确认无消费者后停止旧 PID `92298`，`127.0.0.1:8787` 已释放；搬瓦工没有图谱服务可删除且未执行远程变更 |
| 任务 8 本地验收 | 已完成 | 26 项测试通过；18 个领域、371 个项目、391 条关系校验通过；检索评测 66/66；静态站 1,577 个文件；最终发布包 1,360,142 字节 |
| 浏览器视觉验收 | 已完成 | 桌面与 390px 手机视口正常；筛选和清除条件可用；控制台 0 错误、0 警告 |
| GitHub 推送与 Cloudflare Pages 连接 | 等待用户授权 | 不推送 `main`，不购买域名；先连接公开总仓库并使用免费 `pages.dev` 地址 |

最终发布包 SHA-256：`02129e5724e1ad804c5121db11eb8a82b491c3380cc3d9b8f3cde2f502ef709f`。

---

## 安全边界

- 不修改搬瓦工的 Sub2API、CPA、PostgreSQL、Redis、Nginx、Xray、IPv6、健康检查或备份。
- 搬瓦工已通过 SSH 只读确认没有开源大梳理服务、目录、端口或路由，因此不执行远程删除。
- 旧的本机 `127.0.0.1:8787` 图谱进程只在确认没有消费者后停止；源代码、Git 历史和数据不删除。
- 不修改 `/Users/zhangxuetao/Desktop/八卦编程语言` 或 `/Users/zhangxuetao/Desktop/八卦模型训练方案`。
- 不接入真实广告、不购买域名、不修改 Cloudflare 账户、不推送 GitHub 主分支，直到本地验收完成并得到用户确认。
- 不公开私人仓库名称、路径、凭据、账号、API 密钥或服务器配置。

## 任务 1：保存架构决策和安全清单

**Files:**
- Create: `docs/operations/scope-and-safety.md`
- Use: `docs/superpowers/specs/2026-07-19-cloudflare-pages-atlas-architecture.md`

- [ ] **Step 1: 记录公开、私人和服务器边界**

在 `docs/operations/scope-and-safety.md` 记录公开总仓库地址、当前提交基线的 371 个项目、未来分类仓库规则、私人仓库不公开规则、Cloudflare Pages 发布目标，以及搬瓦工只保留现有中转职责。另一个窗口的未提交数据不复制到本分支。

- [ ] **Step 2: 记录只读核查证据**

记录 2026-07-19 的核查结果：搬瓦工没有 `kai-yuan`、`atlas`、`8787`、`8088` 相关服务或端口；Docker 只有 `sub2api`、`sub2api-postgres`、`sub2api-redis`。记录本机 8787 是失效的旧图谱进程，不能当作可用服务。

- [ ] **Step 3: 运行敏感资料扫描**

```bash
rg -n 'ghp_|github_pat_|Authorization: Bearer|api[_-]?key|password|token' README.md AGENTS.md llms.txt docs site_src scripts schema || true
```

预期：只出现示例字段、政策说明或历史文档中的非秘密文字；真实凭据不得进入公开发布文件。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-07-19-cloudflare-pages-atlas-architecture.md docs/operations/scope-and-safety.md
git commit -m "docs: define Cloudflare Pages atlas boundaries"
```

## 任务 2：采用并验证现有静态网站分支

**Files:**
- Inspect: `scripts/published_catalog.py`, `scripts/export_catalog_v1.py`, `scripts/build_static_site.py`
- Inspect: `tests/`, `dist/v1/`, `site_src/`

- [ ] **Step 1: 检查分支来源和工作区**

```bash
git status --short
git log --oneline --decorate -5
git diff main...HEAD --stat
```

预期：当前分支来自现有 `feature/agent-directory-site`，不包含用户另一个窗口在 `main` 上的未提交修改。

- [ ] **Step 2: 运行已有测试**

```bash
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/validate_graph.py
.venv/bin/python scripts/run_retrieval_eval.py
```

预期：所有测试通过，图谱验证为 `OK`，检索评测不低于 80%。失败时记录原因，不绕过测试。

- [ ] **Step 3: 生成真实发布包**

```bash
.venv/bin/python scripts/export_catalog_v1.py --output build/catalog-v1
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases --release-name cloudflare-pages-local
```

预期：生成首页、分类页、项目页、`api/v1`、`llms.txt`、`robots.txt`、站点地图和带 SHA-256 清单的发布包。

## 任务 3：移除过时的搬瓦工展示方案

**Files:**
- Modify: `docs/operations/static-release.md`
- Modify: `ops/cloudflare/cache-rules.md`
- Delete: `ops/nginx/kai-yuan-da-shu-li.conf.example`
- Modify: `README.md`, `docs/DISCOVERY.md`
- Create: `docs/operations/cloudflare-pages-connection.md`

- [ ] **Step 1: 将发布说明改为 Cloudflare Pages**

发布文档必须说明：GitHub 是源码和历史备份，Cloudflare Pages 是发布目标，GitHub Actions 只验证和生成构建产物，第一次连接GitHub需要用户在浏览器中确认授权。

- [ ] **Step 2: 删除活跃的 Nginx 展示配置**

删除只用于旧搬瓦工展示计划的 Nginx 示例文件，并在发布文档中说明它已被 Cloudflare Pages 方案取代。不得修改任何搬瓦工实际 Nginx 配置。

- [ ] **Step 3: 添加中文连接说明**

`docs/operations/cloudflare-pages-connection.md` 按顺序说明：进入 Workers 和 Pages、创建 Pages 项目、选择 GitHub、只授权 `Zunzhe966/kai-yuan-da-shu-li`、设置构建命令和输出目录、先使用 `pages.dev`。不得要求用户现在购买域名或升级套餐。

- [ ] **Step 4: Commit**

```bash
git add README.md docs/DISCOVERY.md docs/operations/static-release.md docs/operations/cloudflare-pages-connection.md ops/cloudflare/cache-rules.md
git rm ops/nginx/kai-yuan-da-shu-li.conf.example
git commit -m "docs: make Cloudflare Pages the atlas deployment target"
```

## 任务 4：固定总仓库和未来分类仓库拓扑

**Files:**
- Create: `data/sources.yaml`
- Create: `docs/repository-topology.md`
- Create: `scripts/repository_sources.py`
- Create: `tests/test_repository_topology.py`

- [ ] **Step 1: 写失败测试**

测试要求：当前 `sources.yaml` 只包含总仓库自身；每个来源有 `name`、`url`、`visibility`、`revision` 和 `content_path`；私人来源、非 HTTPS 地址、重复名称和空 revision 被拒绝。

- [ ] **Step 2: 验证测试失败**

```bash
.venv/bin/python -m unittest tests.test_repository_topology -v
```

预期：因 `scripts.repository_sources` 不存在而失败。

- [ ] **Step 3: 实现来源清单校验**

`scripts/repository_sources.py` 暴露 `load_sources(path: Path) -> list[dict]` 和 `validate_sources(items: list[dict]) -> list[str]`。校验拒绝 `visibility: private`、非 HTTPS URL、空 revision、重复名称和缺少内容路径。当前不拉取远程分类仓库。

- [ ] **Step 4: 文档化拆分门槛**

写明：当前总仓库继续使用；未来只有在单仓库接近 GitHub 推荐的 10GB、发布构建过慢或领域需要独立贡献时，才按领域拆分。分类仓库发布版本通过清单和校验值合并，不使用 Git 子模块。

- [ ] **Step 5: Run and commit**

```bash
.venv/bin/python -m unittest tests.test_repository_topology -v
git add data/sources.yaml docs/repository-topology.md scripts/repository_sources.py tests/test_repository_topology.py
git commit -m "feat: define hub and future category repositories"
```

## 任务 5：加入非阻塞的智能体反馈和点星说明

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/agent-support-and-stars.md`
- Modify: `tests/test_build_static_site.py`

- [ ] **Step 1: 写行为测试**

测试要求：公开机器入口仍然只返回客观项目记录；页面文案不得要求点星才能访问；广告、点星和报告都不能进入客观排序。

- [ ] **Step 2: 写非阻塞协议**

规则为：智能体先完成用户任务；确认目录确实有帮助后，如果已有GitHub低风险授权，可以自行给总仓库点星；没有授权时不打断、不弹阻塞问题，只在任务结果末尾给可选提示；不批量点无关仓库，不以点星换取访问或报告。

- [ ] **Step 3: 保留真实差异报告**

说明智能体只在自行打开上游并发现实质不一致时提交一条报告；没有变化不提交；报告不能自动修改正式数据。

- [ ] **Step 4: Run and commit**

```bash
.venv/bin/python -m unittest tests.test_build_static_site -v
git add AGENTS.md docs/agent-support-and-stars.md tests/test_build_static_site.py
git commit -m "docs: define non-blocking agent support policy"
```

## 任务 6：保留广告接口但不接真实广告

**Files:**
- Create: `docs/advertising.md`
- Modify: `README.md`
- Modify: `tests/test_surface_consistency.py`

- [ ] **Step 1: 记录两类广告接口**

文档分别说明真人页面广告和机器 `sponsored_results`。两者都必须披露广告主、活动编号、时间和落地页；付费内容不能影响自然排序；第一阶段不加载真实广告脚本、不注册广告账户。

- [ ] **Step 2: 测试广告隔离**

测试公开记录不包含广告脚本、`paid_rank`、真实广告主数据或敏感收款信息。机器响应第一阶段不注入任何赞助内容。

- [ ] **Step 3: Run and commit**

```bash
.venv/bin/python -m unittest tests.test_surface_consistency -v
git add README.md docs/advertising.md tests/test_surface_consistency.py
git commit -m "docs: reserve transparent human and agent ad surfaces"
```

## 任务 7：停止本机失效的 8787 旧进程

**Files:**
- Modify outside public repo: `/Users/zhangxuetao/Documents/云服务器模型管理/00-总览/当前运行状态.md`
- Modify outside public repo: `/Users/zhangxuetao/Documents/云服务器模型管理/00-总览/域名与端口总表.md`

- [ ] **Step 1: 确认消费者不存在**

```bash
rg -n '127\.0\.0\.1:8787|localhost:8787|:8787' /Users/zhangxuetao/Documents /Users/zhangxuetao/Projects/owned -g '*.md' -g '*.sh' -g '*.py' -g '*.json' || true
```

只允许发现历史文档和本项目源码；不得有中转站或其他项目依赖。

- [ ] **Step 2: 停止旧进程并验证端口释放**

仅对已确认的 `scripts/http_api.py --host 127.0.0.1 --port 8787` 进程发送 `TERM`，不停止其他 Python、代理或中转进程。验证 `lsof -nP -iTCP:8787 -sTCP:LISTEN` 无输出。

- [ ] **Step 3: 更新状态记录**

把“旧进程监听中”改为“旧进程已停止；代码保留在GitHub和本机仓库；Cloudflare Pages为后续发布目标”。不删除源代码、数据或历史记录。

## 任务 8：最终验收和 Cloudflare 连接闸门

- [ ] **Step 1: 运行全套验证**

```bash
.venv/bin/python scripts/validate_graph.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/run_retrieval_eval.py
.venv/bin/python scripts/export_catalog_v1.py --output build/catalog-v1
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases --release-name phase-one-acceptance
```

- [ ] **Step 2: Check size, secrets and ad separation**

```bash
du -sh dist/v1 build/site build/releases
find build/site -type f -size +2M -print
rg -n 'adsbygoogle|doubleclick|paid_rank|ghp_|github_pat_|authorization: bearer' dist/v1 build/site README.md AGENTS.md llms.txt docs || true
```

预期：没有真实广告代码、付费排序字段、凭据或大文件；构建结果适合 Cloudflare Pages 免费限制。

- [ ] **Step 3: Review isolated history**

检查 `git status --short`、`git log --oneline -15` 和 `git diff origin/feature/agent-directory-site...HEAD --stat`，确认只包含本计划的公开网站、文档和测试修改。不得直接推送 `main`。

- [ ] **Step 4: 请求浏览器授权**

只有本地验收通过后，才请用户在已登录的 Cloudflare 浏览器中确认 GitHub 授权。连接目标只允许 `Zunzhe966/kai-yuan-da-shu-li`，先使用 `pages.dev`，不买域名、不升级套餐、不连接搬瓦工。

## 验收标准

1. 搬瓦工现有中转服务状态和配置无变化。
2. 搬瓦工没有开源大梳理残留需要删除；本机失效 8787 已停止且源代码保留。
3. GitHub总仓库可以生成静态人类页面、智能体接口、分类数据和压缩发布包。
4. 未来分类仓库有来源清单和固定版本规则，但当前不创建空仓库。
5. 私人仓库和敏感资料不进入公开构建。
6. 真人广告与智能体赞助接口分离，第一阶段不加载真实广告。
7. 智能体差异报告非任务制、去重、可审核；点星建议非阻塞、非强制、不能批量刷星。
8. Cloudflare连接只在用户看到并确认 GitHub 授权后执行。
