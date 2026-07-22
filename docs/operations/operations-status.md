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

- 当前 Cloudflare 凭据仅具备当前账户的 `Cloudflare Pages: Edit`，GitHub Secret `CLOUDFLARE_API_TOKEN` 已替换；未修改域名、DNS、支付、成员或其他权限。
- [PR #27](https://github.com/Zunzhe966/kai-yuan-da-shu-li/pull/27) 已将 Wrangler 生产分支显式固定为 `main`，避免精确 SHA 检出被误发布到 `HEAD` 预览环境。
- 恢复验收基线为 `main` 提交 `049316f62a171028aeaa35a55bcf3db82ecc7f69`：[`verify` 运行 29964294481](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964294481) 已成功，并自动触发成功的 [`pages-deploy` 运行 29964318056](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964318056)。验收元数据为 `catalog_hash=0ce65b272d8bf3e0290a279cc956ca9fd9506750034b009c1d40bc3c112034a7`、`node_count=495`、`edge_count=660`。
- 台账 PR 合并后的后续提交 `b77fd3fdbe4a41092af869fca31ce55e0e6c4a48` 也已通过 [`verify` 运行 29964617632](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964617632) 和自动 [`pages-deploy` 运行 29964641257](https://github.com/Zunzhe966/kai-yuan-da-shu-li/actions/runs/29964641257)，证明连续发布有效。
- 当前线上提交不在版本化台账中写死；以 `https://kai-yuan-da-shu-li.pages.dev/api/v1/meta.json` 的实时 `source_revision` 、`catalog_hash`、`node_count`、`edge_count` 与当前 `main` 一致为发布完成标准。
- 默认发布路径为 `main → verify → pages-deploy → 生产探针`，日常不需要浏览器登录或手动上传。Token 失效或撤销时，仍只允许轮换 Pages 部署所需的最小权限凭据。
