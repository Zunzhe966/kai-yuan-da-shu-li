# Cloudflare Pages 连接 GitHub

这一步用于消除当前“GitHub 已更新但 Pages 仍旧版”的手动发布漂移。GitHub Actions 已在云端验证仓库内容，本机工作区不是生产发布前提。默认路径是“GitHub Actions 自动部署 + 可追溯证据”；只有平台未开放 API 的授权环节才做一次性人工最小化授权。

## 自动化优先路径（推荐默认）

1. 在 GitHub 仓库设置一次性配置 secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
2. `main` 的 `verify` 成功完成后（或受控手动触发 `pages-deploy`），GitHub Actions 自动构建 `build/site` 并执行：`wrangler pages deploy build/site --project-name kai-yuan-da-shu-li`。
3. 通过 `https://kai-yuan-da-shu-li.pages.dev/api/v1/meta.json` 返回 200 作为部署事实证据。
4. 把 workflow 运行链接、部署 URL、提交 SHA 写入发布记录。

该路径不依赖每次浏览器登录；授权以 Token 生命周期为准，可在 CI 长期复用。若 secrets 缺失，workflow 会直接失败并提示补齐项。

## 2026-07-23 当前故障事实

- GitHub `main` 提交 `0d5b749` 的 [`verify` 运行 29961438123](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29961438123) 已成功。
- 同一提交自动触发了 [`pages-deploy` 运行 29961471327](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29961471327)，检出、当前 `main` 校验、Secret 名称检查和 2089 文件站点构建均成功，说明固定触发线路存在。
- `pages-deploy` 在 Wrangler 查询 Pages 项目时收到 Cloudflare `Authentication error [code: 10000]`，不是构建失败或 GitHub 未同步。
- GitHub 仓库仍有 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 两个 Secret 名称，但 Cloudflare 控制台当前显示 Account API Token 与 User API Token 都为空。因此旧 Secret 对应的 Token 已失效、被撤销或不再属于当前账户。
- 当前构建已在元数据中写入 `source_revision` 与 `catalog_hash`；Token 修复后，线上探针会同时比较提交、目录哈希、节点数和边数，不再只按数量判断发布成功。
- 修复动作：在当前 Cloudflare 账户创建仅具备 Pages 部署所需权限的新 Token，替换 GitHub `CLOUDFLARE_API_TOKEN`，重新运行 `pages-deploy` 并以线上 meta 与当前构建一致作为完成证据。
- Token 值、账户 ID 和任何恢复信息不得写进仓库、日志或公开台账。修复后仍使用 GitHub Actions 固定线路，不恢复每次浏览器手动上传。

## 控制台 Connect to Git（可选）

仅在需要开启“Cloudflare 自治构建”模式，或你希望额外保留控制台回退路径时执行一次：

1. 打开 Cloudflare 控制台。
2. 进入“Workers 和 Pages”。
3. 选择“创建应用”，再选择“Pages”和“连接到 Git”。
4. 选择 GitHub，并在 GitHub 授权页面选择“仅选择仓库”。
5. 只勾选 `Zunzhe966/kai-yuan-da-shu-li`。
6. 返回 Cloudflare 后选择该仓库并保存。

## Connect to Git 构建设置

```text
项目名称：kai-yuan-da-shu-li
生产分支：main
框架预设：None
构建命令：python3 scripts/build_static_site.py --output build/site --base-url https://kai-yuan-da-shu-li.pages.dev
构建输出目录：build/site
根目录：/
```

保存后等待第一次构建。成功后继续使用固定的免费地址 `https://kai-yuan-da-shu-li.pages.dev`，直到自有域名购买、绑定并重新构建。预览部署会有临时地址，但不得将临时地址写入 sitemap、robots 或 `llms.txt`。

说明：当 `pages-deploy` 与 Connect to Git 同时存在时，以 GitHub Actions 的 `wrangler pages deploy` 为推荐主路径；Connect to Git 作为可选补充，不要求每次发布都依赖控制台。

## 授权机制结论

- GitHub App 授权通常是一次授权长期有效；后续自动部署不需要每次再次登录。
- 触发再次授权的常见场景：撤销 GitHub App、Cloudflare 账号切换、仓库迁移、权限范围变更。
- 若改用 API Token + `wrangler pages deploy`，日常发布不需要浏览器授权；仅在 Token 过期/撤销时更新凭据。

## 必须补的 GitHub 保护

连接完成后，在 GitHub 为 `main` 配置受保护分支：要求 `verify / test-and-build` 成功，要求通过 Pull Request 合并，并限制绕过规则的人员。原因是 Cloudflare 会在 `main` 改变时立即构建；只有先阻止未经验证的提交进入 `main`，云端验证才能真正成为发布闸门。

## 第一次验收

依次检查：

- 首页能打开；
- 分类筛选可用；
- 任意项目详情能打开并跳转原始 GitHub；
- `/llms.txt`、`/robots.txt` 和 `/api/v1/meta.json` 返回 200；
- 页面没有真实广告代码；
- Cloudflare 没有连接搬瓦工或任何私人仓库。

通过这些检查后再讨论正式域名。第一阶段不购买域名、不启用收费套餐、不添加付款方式。
