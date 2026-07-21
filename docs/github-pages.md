# 网站部署说明

当前公开网站由 Cloudflare Pages 提供：<https://kai-yuan-da-shu-li.pages.dev/>。GitHub Pages 不是当前发布渠道；本文件保留旧名称仅为兼容既有链接。

## 当前部署

- 发布来源：本机生成的 `build/site` 静态站。
- 线上项目：Cloudflare Pages `kai-yuan-da-shu-li`。
- 当前方式：优先自动发布（GitHub 连接触发或 API Token + `wrangler pages deploy`）；仅在自动化阻塞时短暂人工介入。
- 正式机器索引：<https://raw.githubusercontent.com/Zunzhe966/kai-yuan-da-shu-li/main/dist/atlas-index.json>。

完整的构建、发布、回滚和后续 GitHub 自动部署流程见 [static-release.md](./operations/static-release.md) 与 [cloudflare-pages-connection.md](./operations/cloudflare-pages-connection.md)。

`scripts/http_api.py` 仅保留作本地兼容工具，不作为公网网站服务，也不运行在 Cloudflare Pages。
