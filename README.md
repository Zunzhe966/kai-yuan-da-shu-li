# 开源大梳理

开源项目检索与深度介绍平台。人类可以像阅读专题目录一样搜索、筛选和阅读项目；智能体通过 REST 或 MCP 读取同一份正式数据，并在有限权限内建立草稿、编辑和提交审核。

## 当前架构

- `platform/`：Cloudflare Worker 应用，同时服务人类页面、REST、MCP 和内部 Studio。
- D1：正式事实源，保存项目、作者、不可变修订、草稿、审核、变化报告和审计事件。
- R2：保存可校验的确定性备份；私有 GitHub 仓库可作为二次备份，不是生产数据库。
- `schema/project-publication-v1.schema.json`：正式项目合同，包含固定 14 个正文栏目。
- `data/`、`graph/`、`dist/v1/`：旧静态目录与迁移输入。新站搜索和排序不依赖旧图谱。

## 产品入口

- 项目目录：`/`
- 项目正文：`/projects/{id}`
- 作者与组织：`/creators/{id}`
- 机器入口：`/llms.txt`、`/openapi.json`、`/mcp`
- REST：`/api/v1/meta`、`/api/v1/search`、`/api/v1/projects/{id}`、`/api/v1/creators/{id}`
- 内部编辑台：`/studio`（Bearer 身份与最小 scope）

## 发布规则

1. 新项目必须先用稳定仓库 ID 查重，同一仓库同时只能有一个待发布草稿。
2. 草稿必须通过严格 Schema 和 14 栏固定模板。不确定的信息显式写 `unknown`，不伪造正文或作者。
3. 编辑身份不能审核自己的高风险草稿；只有已批准草稿才能发布。
4. 发布只追加新修订，不覆盖或删改历史修订。
5. 外部变化报告只进入隔离核验队列，不能自动修改正式记录或排名。

## 本地运行

```bash
cd platform
npm install
npm run db:migrate:local
npm run dev -- --port 8788
```

访问 `http://127.0.0.1:8788`。验证命令：

```bash
.venv/bin/python -m pytest tests/test_migrate_legacy_publications.py -q
cd platform
npm run check
npm test
npm run test:e2e -- public-flow.spec.ts
```

需要写入的编辑 E2E 只能对一次性预览 D1 运行，参见 [`docs/operations/platform-cutover.md`](./docs/operations/platform-cutover.md)。

## 迁移与上线

旧 YAML 通过 `scripts/migrate_legacy_publications.py` 转换为严格 publication JSONL，经校验后导入 D1。旧 `pages.dev` 站在 Worker 预览、迁移核账、备份恢复和浏览器门禁全部通过前保持不动。

完整切换与回滚流程见 [`docs/operations/platform-cutover.md`](./docs/operations/platform-cutover.md)。

## License

索引与编辑内容默认按 [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) 发布；上游项目保留各自许可证。
