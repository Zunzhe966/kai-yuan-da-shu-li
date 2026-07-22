# Cloudflare Pages 连接 GitHub

这一步用于消除当前“GitHub 已更新但 Pages 仍旧版”的手动发布漂移。GitHub Actions 已在云端验证仓库内容，本机工作区不是生产发布前提。默认路径是“GitHub Actions 自动部署 + 可追溯证据”；只有平台未开放 API 的授权环节才做一次性人工最小化授权。

## 自动化优先路径（推荐默认）

1. 在 GitHub 仓库设置一次性配置 secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
2. `main` 的 `verify` 成功完成后（或受控手动触发 `pages-deploy`），GitHub Actions 自动构建 `build/site` 并执行：`wrangler pages deploy build/site --project-name kai-yuan-da-shu-li --branch main`。显式分支参数是生产发布不变式，不得依赖 detached HEAD 的自动推断。
3. 通过 `https://kai-yuan-da-shu-li.pages.dev/api/v1/meta.json` 返回 200 作为部署事实证据。
4. 把 workflow 运行链接、部署 URL、提交 SHA 写入发布记录。

该路径不依赖每次浏览器登录；授权以 Token 生命周期为准，可在 CI 长期复用。若 secrets 缺失，workflow 会直接失败并提示补齐项。

## 2026-07-23 恢复完成证据

- 旧 `CLOUDFLARE_API_TOKEN` 已失效，历史运行 `29961471327` 在 Wrangler 查询 Pages 项目时返回 `Authentication error [code: 10000]`。当前 Cloudflare 账户已创建只包含 `Cloudflare Pages: Edit` 的最小权限 Token，并替换 GitHub Secret `CLOUDFLARE_API_TOKEN`；未修改域名、DNS、支付、账户成员或其他权限。
- 凭据替换后，受控手动运行 [`29963596909`](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29963596909) 已完成认证和上传，证明 Token 有效。但 Actions 按精确 SHA 检出时处于 detached HEAD，Wrangler 将分支误判为 `HEAD`，只生成 `head.kai-yuan-da-shu-li.pages.dev` 预览别名，生产地址未更新。
- 该预览部署的 `source_revision=71e0ba8dd9a4b13dd234a658368cf1c2b33c1436`、`catalog_hash=0ce65b272d8bf3e0290a279cc956ca9fd9506750034b009c1d40bc3c112034a7`、`node_count=495`、`edge_count=660`，证明构建内容正确，问题只在部署环境归类。
- [PR #27](https://github.com/Zunzhe966/kai-yuan-da-shu-li/pull/27) 在 Wrangler 命令中显式加入 `--branch main`，同时保留精确 SHA 检出、当前 `main` 校验和线上元数据探针。
- PR 合并为 `main` 提交 `049316f62a171028aeaa35a55bcf3db82ecc7f69` 后，[`verify` 运行 29964294481](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964294481) 成功，并通过 `workflow_run` 自动触发 [`pages-deploy` 运行 29964318056](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964318056)；该部署、生产探针均成功。
- 生产 `https://kai-yuan-da-shu-li.pages.dev/api/v1/meta.json` 最终返回 `source_revision=049316f62a171028aeaa35a55bcf3db82ecc7f69`、相同目录哈希、495 个节点和 660 条关系，固定自动上线线路已恢复。
- Token 值和任何恢复信息不得写进仓库、日志或公开台账。日常发布不需要浏览器登录或手动上传；仅在 Token 失效或被撤销时轮换凭据。

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
