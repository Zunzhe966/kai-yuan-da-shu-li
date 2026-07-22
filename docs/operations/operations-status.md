# 运营状态与决策台账

更新时间：2026-07-23

## 已冻结决策

- 收款主体：个体户（已确认）。
- 发布主体：公开总仓库 `Zunzhe966/kai-yuan-da-shu-li` + Cloudflare Pages `kai-yuan-da-shu-li`。
- 审核机制：智能体审核优先，必须保留可追溯证据；仅在自动化阻塞时人工最小化介入。

## 对后续步骤的影响

### AdSense 与广告账户

- 申请账号时主体信息按“个体户”准备，不再按自然人或公司双轨并行。
- 账户实名、收款资料、税务信息必须与个体户主体一致，避免平台主体与收款主体不一致导致冻结或拒付。

### 银行与跨境收款

- 收款账户按个体户对应账户准备，确保合同主体、平台主体、入账主体一致。
- 归档材料至少包含：平台结算单、付款收据、银行入账记录、对应服务说明。

### 税务与申报

- 以个体户为申报主体预留材料：收入记录、结算凭证、银行流水、业务合同。
- 广告与跨境服务税务处理在正式收款前，仍需向主管税务机关或税务师做一次口径确认并留档。

## Cloudflare 自动化状态

- GitHub `main` 提交 `0d5b749` 已通过云端 `verify`，并自动触发 `pages-deploy`；GitHub 到部署工作流的固定线路有效。
- Pages 项目存在，但 Cloudflare 当前没有可用的 Account API Token 或 User API Token；Wrangler 因此返回认证错误 `10000`。
- 默认推进路径仍是最小权限 API Token + `wrangler pages deploy`。下一次账户变更只创建 Pages 部署所需 Token、替换 GitHub Secret，并以 `source_revision`、`catalog_hash`、节点数和边数一致完成验收。
