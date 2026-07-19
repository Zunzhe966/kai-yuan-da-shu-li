# Cloudflare Pages 连接 GitHub

这一步只在本地网站通过全部验收后执行。用户需要在已经登录 Cloudflare 的浏览器里确认一次 GitHub 授权，密码和验证码不交给智能体。

## 浏览器操作

1. 打开 Cloudflare 控制台。
2. 进入“Workers 和 Pages”。
3. 选择“创建应用”，再选择“Pages”和“连接到 Git”。
4. 选择 GitHub，并在 GitHub 授权页面选择“仅选择仓库”。
5. 只勾选 `Zunzhe966/kai-yuan-da-shu-li`。
6. 返回 Cloudflare 后选择该仓库。

## 构建设置

```text
项目名称：kai-yuan-da-shu-li
生产分支：main
框架预设：None
构建命令：python3 scripts/build_static_site.py --output build/site --base-url "$CF_PAGES_URL"
构建输出目录：build/site
根目录：/
```

保存后等待第一次构建。成功后 Cloudflare 会提供一个类似 `kai-yuan-da-shu-li.pages.dev` 的免费地址。

## 第一次验收

依次检查：

- 首页能打开；
- 分类筛选可用；
- 任意项目详情能打开并跳转原始 GitHub；
- `/llms.txt`、`/robots.txt` 和 `/api/v1/meta.json` 返回 200；
- 页面没有真实广告代码；
- Cloudflare 没有连接搬瓦工或任何私人仓库。

通过这些检查后再讨论正式域名。第一阶段不购买域名、不启用收费套餐、不添加付款方式。
