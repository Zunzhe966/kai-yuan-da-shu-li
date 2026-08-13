# 新平台预览、上线与回滚手册

本手册用于将旧 Cloudflare Pages 静态站切换为 Worker + D1 + R2 动态平台。“先预览、后切换”是强制门禁；在预览、迁移、备份恢复和浏览器验收全部通过前，不修改旧站、DNS 或自定义域名。

## 1. 服务边界

| 组件 | 用途 | 不允许 |
|---|---|---|
| Worker | 人类页面、REST、MCP、Studio、定时任务 | 直接覆盖已发布修订 |
| D1 | 正式数据、草稿、审核、报告、审计 | 当成缓存或可随时丢弃的临时库 |
| R2 | 确定性 JSONL 备份与 manifest | 作为在线写入主库 |
| 私有 GitHub 备份 | 异地审计副本 | 持有 D1 写权或部署权 |
| 旧 Pages 站 | 切换前的公网稳定入口 | 在预览门禁前提前覆盖 |

## 2. 发布前门禁

在仓库根目录执行：

```bash
cd platform
npm run check
npm test
npm run test:e2e -- public-flow.spec.ts
npx wrangler d1 migrations apply DB --local
cd ..
git diff --check
```

如使用历史迁移数据，核账必须记录：旧源数、无效数、重复仓库组、独立项目数、D1 项目数、D1 修订数和重复键数。任何静默丢失都阻止上线。

## 3. 一次性 Cloudflare 预览资源

预览和生产必须使用不同 D1、R2 和 Worker 名称。资源 ID 可写入 Wrangler 环境配置；API Token、Access 密钥和 GitHub Token 不得入库。

```bash
cd platform
npx wrangler d1 create kaiyuan-dashuli-preview
npx wrangler r2 bucket create kaiyuan-dashuli-backups-preview
```

将返回的 D1 ID 绑定到 `preview` 环境的 `DB`，R2 绑定名固定为 `BACKUPS`。然后：

```bash
npx wrangler d1 migrations apply DB --remote --env preview
npx wrangler deploy --env preview
```

`GITHUB_API_TOKEN` 是可选的 Worker secret，用于提高新建项目时的 GitHub API 限额；只需公开仓库读权。

## 4. 迁移预览数据

```bash
cd ..
[如使用旧数据迁移：.venv/bin/python scripts/migrate_legacy_publications.py ...]
cd platform
npx tsx scripts/import-jsonl.ts \
  ../build/project-publication-v1.jsonl \
  --remote --env preview \
  --report ../build/preview-import-report.json
```

导入后用 D1 SQL 核对 `projects`、`project_revisions`、重复仓库键和当前修订。历史迁移工具已归档，新内容一律通过 Studio/MCP 上传。

## 5. 身份和最小权限

明文令牌只在创建时显示一次，D1 只保存 SHA-256。推荐拆分：

| 身份 | scopes |
|---|---|
| 编辑 | `draft:create`, `draft:update`, `evidence:add` |
| 审核发布 | `draft:update`, `review:approve`, `publish` |
| 变化核验 | `report:verify` |
| 身份审计 | `actors:read` |
| 备份机器人 | `backup:read`，仅同时授予 R2 读权 |

高风险草稿的创建身份和审核身份必须不同。日常编辑不需要 Cloudflare Dashboard 权限。

## 6. 预览探针

对预览 URL 验证全部路径：

```text
/health
/api/v1/meta
/api/v1/search?q=Aider
/api/v1/projects/aider
/openapi.json
/mcp
/robots.txt
/sitemap.xml
/llms.txt
/studio
```

用 `1440x900` 和 `390x844` 运行公共 Playwright 流程。写入 E2E 只能在可丢弃预览 D1 中运行：

```bash
PLAYWRIGHT_BASE_URL=https://<preview-worker> \
E2E_EXPECTED_PROJECT_COUNT=<audited-project-count> \
E2E_EDITOR_TOKEN=<one-time-editor-token> \
E2E_REVIEWER_TOKEN=<one-time-reviewer-token> \
E2E_REPOSITORY_URL=https://github.com/<owner>/<unused-public-repo> \
E2E_PROJECT_ID=e2e-<unique-id> \
E2E_ALLOW_PREVIEW_WRITES=yes \
npm run test:e2e
```

Playwright 不自动启动或复用本地 `8788` 服务，必须显式提供目标 URL。公共流程要求精确的审计项目数；写入流程还会读取 `/health`，只有服务端返回 `deployment_environment=preview` 且显式设置 `E2E_ALLOW_PREVIEW_WRITES=yes` 才会执行发布。

验收内容：搜索与组合筛选、项目正文 14 栏、作者页、草稿新建与查重、栏目编辑、预览、独立审核、发布、MCP 工具发现和 0 控制台错误。

## 7. 备份与恢复演练

1. 触发一次预览备份，确认 R2 存在完整 JSONL、manifest 和 `backups/latest.json`。
2. 创建第二个空 D1，应用全部迁移。
3. 用 `backup:restore` 恢复，比较文件集、count、SHA-256、revision watermark、抽样搜索和 HTML。
4. 恢复失败必须保持目标库原子不变；非空目标库默认拒绝恢复。

账号首次启用 R2 时，Cloudflare 会要求确认免费额度之外的按量计费订阅。该费用确认必须由账号持有人明确授权；未确认前，预览 Worker 可以完成只读与 Studio 门禁，但 R2 备份恢复门禁不得标记通过，也不得切换生产入口。

恢复演练未通过时不允许切换。

## 8. 生产切换

1. 用与预览相同的已验证代码创建生产 D1/R2/Worker，重复迁移和核账。
2. 记录 Git SHA、Worker deployment ID、D1 revision watermark、迁移报告和最新备份哈希。
3. 先让旧 `pages.dev` 入口受控跳转到新 Worker，再执行公网探针。
4. 购买自定义域名后，将根域和 `www` 绑定到生产 Worker，`www` 对根域做 301。
5. 更新 canonical、sitemap、robots、`llms.txt` 和公开文档中的主入口。

Cloudflare 的常用中文名是“克劳德弗莱尔”，域名服务叫“域名注册商”。自定义域名可持续按年续费；本项目的页面和 API 运行在 Cloudflare Worker/D1/R2，不需要单独购买传统虚拟主机或服务器空间。

## 9. 回滚

生产探针、数据核账或写入流程任一失败：

1. 立即停止 Studio 写入凭证。
2. 将公网入口指回旧 Pages 或上一个健康 Worker 部署。
3. 保留失败 D1 和 R2 现场，不直接清空。
4. 用已验证备份恢复到新 D1，通过门禁后再重新切换。

回滚完成后记录原因、影响时间、部署 ID、D1 watermark 和修复提交。
