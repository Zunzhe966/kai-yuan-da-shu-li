# 静态目录发布与回滚

## 系统边界

- GitHub 保存源文件、目录数据、设计历史和验证记录。
- Cloudflare Pages 保存并分发公开网站，不使用搬瓦工作为网站源站。
- `build/` 全部是可重新生成的临时产物，可以删除；不作为需要长期同步到本机或 Cloudflare 的数据副本。
- 网站不运行爬虫、模型、数据库、动态搜索或账号服务。
- GitHub Actions 在 GitHub 云端临时检出当前提交、安装依赖、验证图谱、运行测试与检索评测，并生成 7 天临时制品；它不需要使用者本机持有完整副本。

## 本地复现（可选）

依次运行：

```bash
.venv/bin/python scripts/validate_graph.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases
shasum -a 256 build/releases/*.tar.gz
```

这些命令用于开发时复现或排障，不是生产发布的必经步骤。正式验证以 GitHub Actions 的本次提交记录为准。

## 云端发布链路（推荐默认）

```text
Pull request
→ GitHub Actions 云端验证（verify）
→ 验证通过后合并到受保护的 main
→ verify 在 main 成功完成后自动触发 pages-deploy（或受控 workflow_dispatch）
→ pages-deploy 构建 build/site 并执行 wrangler pages deploy
→ 自动发布到 https://kai-yuan-da-shu-li.pages.dev
→ 线上 api/v1/meta.json 作为发布后事实核验
```

该路径不依赖 Cloudflare 控制台每次人工点选发布，不复用本地目录，发布证据在 GitHub Actions 运行记录中可追溯。`pages-deploy` 只接受 `main` 上成功完成的 `verify`；开始部署前还会确认该提交仍是当前 `main`，避免旧验证任务发布过时版本。

## Cloudflare Pages 发布

当前生产项目默认路径为 **GitHub Actions + Cloudflare API Token + `wrangler pages deploy`**（零反复人工）。手动直传仅用于自动化被平台限制阻塞时的临时兜底。

一次性配置以下 GitHub Secrets（仓库级）：

- `CLOUDFLARE_API_TOKEN`：最小权限建议为 Pages 编辑（可部署项目）。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID。

`pages-deploy` 工作流会先检查 secrets；缺失时会在日志中给出明确错误并指向本文档。

如果还需要启用 Cloudflare 控制台的 **Connect to Git**（让 Cloudflare 自己拉仓库构建），可按下列参数配置；这是可选路线，不是默认发布通道：

```text
生产分支：main
框架预设：None
构建命令：python3 scripts/build_static_site.py --output build/site --base-url https://kai-yuan-da-shu-li.pages.dev
构建输出目录：build/site
根目录：/
```

第一次连接必须只授权 `Zunzhe966/kai-yuan-da-shu-li`。若平台界面仍要求人工点选仓库，此步骤应一次完成并长期复用，后续发布转为自动触发。连接后，为 `main` 启用 GitHub 受保护分支，要求 `verify / test-and-build` 通过才允许合并；否则 Cloudflare 可能收到尚未通过验证的提交。当前使用固定的 `https://kai-yuan-da-shu-li.pages.dev`；自有域名确认并绑定后，必须以正式域名重新构建，避免 sitemap、robots 和 `llms.txt` 继续指向旧地址。

## 回滚

代码和正式目录数据都保留在 Git 历史中。回滚步骤：

1. 找到最近一个通过测试的提交；
2. 在独立分支恢复该提交或反向提交有问题的变更；
3. 重新运行完整验证；
4. 合并到生产分支后，由 Cloudflare Pages 自动发布，或由 CI 使用 API Token 执行 `wrangler pages deploy`；
5. 在 Cloudflare 部署记录中确认新版本成功，再删除失败的预览部署。

回滚不需要登录搬瓦工，也不修改中转站、代理或数据库。

## 发布闸门

以下条件全部满足后才连接 Cloudflare：

1. 完整测试、图谱验证和检索评测通过；
2. `build/site` 不超过 Cloudflare Pages 免费文件数和单文件限制；
3. 构建结果没有密钥、账号、私人仓库信息或真实广告脚本；
4. 用户确认 GitHub 授权范围只包含公开总仓库；
5. 先使用 `pages.dev` 验证桌面端、移动端和机器接口；
6. 正式域名、广告和收费服务分别获得用户批准后再配置。
