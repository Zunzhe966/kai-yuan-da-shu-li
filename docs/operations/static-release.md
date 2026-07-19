# 静态目录发布与回滚

## 系统边界

- GitHub 保存源文件、目录数据、设计历史和验证记录。
- Cloudflare Pages 保存并分发公开网站，不使用搬瓦工作为网站源站。
- `build/` 全部是可重新生成的临时产物，可以删除。
- 网站不运行爬虫、模型、数据库、动态搜索或账号服务。
- GitHub Actions 只验证和生成 7 天临时制品，不自动公开或部署。

## 本地发布

依次运行：

```bash
.venv/bin/python scripts/validate_graph.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/build_static_site.py --output build/site --base-url https://example.invalid
.venv/bin/python scripts/build_release.py --site build/site --output build/releases
shasum -a 256 build/releases/*.tar.gz
```

公开前把 `https://example.invalid` 替换为 Cloudflare Pages 提供的正式发布地址或用户确认的自定义域名，再重新生成发现文件和站点地图。

## Cloudflare Pages 发布

Cloudflare Pages 连接 GitHub 总仓库后，每次生产分支更新都会重新构建。构建参数固定为：

```text
生产分支：main
框架预设：None
构建命令：python3 scripts/build_static_site.py --output build/site --base-url https://kai-yuan-da-shu-li.pages.dev
构建输出目录：build/site
根目录：/
```

第一次连接必须由用户在浏览器中确认 GitHub 授权，并且只授权 `Zunzhe966/kai-yuan-da-shu-li`。第一阶段使用固定的 `https://kai-yuan-da-shu-li.pages.dev`，不购买域名、不升级套餐。Cloudflare 的预览部署地址不参与构建，避免 sitemap、robots 和 `llms.txt` 随每次部署变化。

## 回滚

代码和正式目录数据都保留在 Git 历史中。回滚步骤：

1. 找到最近一个通过测试的提交；
2. 在独立分支恢复该提交或反向提交有问题的变更；
3. 重新运行完整验证；
4. 合并到生产分支后由 Cloudflare Pages 自动发布；
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
