# 正式域名切换手册（购域后执行）

前置：Cloudflare Registrar 已完成购买；域名已在同一 Cloudflare 账户；Pages 项目 `kai-yuan-da-shu-li` 已存在。

首选候选（总账）：`openossatlas.com`；备选：`kaiyuanshu.com`。结账页价格与可注册性为准（公开参考 `.com` ≈ $10.44/年 at-cost）。

## 1. Pages 绑定自定义域

1. Cloudflare Dashboard → Workers & Pages → `kai-yuan-da-shu-li` → Custom domains
2. 添加根域（例：`openossatlas.com`）与 `www`
3. 按控制台提示完成 DNS（Registrar 域名通常自动用 Cloudflare NS）
4. 确认 `www` → 根域 **301**

验收：

```bash
curl -sI https://www.<domain>/ | rg -i 'HTTP|location'
curl -sI https://<domain>/ | rg -i 'HTTP'
```

## 2. 用正式 base-url 重建并发布

仓库内将 `pages-deploy` / 本地构建的 `--base-url` 从

`https://kai-yuan-da-shu-li.pages.dev`

改为

`https://<domain>`

至少涉及：

- `.github/workflows/pages-deploy.yml`
- `.github/workflows/verify.yml`（静态站契约构建）
- `docs/operations/static-release.md`
- `docs/operations/cloudflare-pages-connection.md`

然后经 PR 合并 `main`，依赖已接通的 `pages-deploy` 自动上线。

## 3. 发现文件核验

在正式域上确认均返回 200 且内容含正式主机名：

```bash
for p in llms.txt robots.txt sitemap.xml api/v1/meta.json; do
  echo "== $p =="
  curl -sS -o /tmp/p.body -w "%{http_code}\n" "https://<domain>/$p"
  rg -n "<domain>|kai-yuan-da-shu-li.pages.dev" /tmp/p.body | head
done
```

`llms.txt` / `sitemap.xml` / `robots.txt` 不得再把正式入口写成 `pages.dev`。

## 4. 总账

写入：订单号（敏感目录）、年费、部署 ID、Git commit、正式 URL 探测结果。  
本文件只描述步骤，不替代 `开源大梳理项目总账.md`。
