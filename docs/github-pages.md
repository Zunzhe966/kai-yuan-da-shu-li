# GitHub Pages 部署说明（人读入口）

目标：让人类/爬虫打开 Pages 就能看到浏览索引，并指向远程机器索引。

## 推荐最小方案（无构建）

1. 仓库 Settings → Pages → Source: **Deploy from a branch**
2. Branch: `main` / folder: `/docs`
3. 打开站点后访问：
   - `/browse/`（若用 docs 下的 browse 软链）或本仓路径说明
   - 机器索引：https://raw.githubusercontent.com/Zunzhe966/kaiyuan-dashuli/main/dist/atlas-index.json

本仓已在 `docs/browse/` 提供各域人读页；`docs/index.md` 作为 Pages 首页入口。

## 可选：HTTP API

Pages **不能**跑 `scripts/http_api.py`。API 需另外部署（任意 VPS/容器）：

```bash
.venv/bin/python scripts/http_api.py --host 0.0.0.0 --port 8787
```

详见 `docs/remote-api.md`。
