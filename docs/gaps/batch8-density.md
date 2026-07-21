# Batch 8：desktop / finance / blockchain / cms-docs 密度审计

- 日期：2026-07-22
- 对应：S11

## 补录

| domain | id | 品类补洞 |
|---|---|---|
| desktop | fyne | Go 原生 GUI |
| desktop | nwjs | Chromium+Node 桌面运行时 |
| desktop | dioxus | Rust 跨端 UI |
| finance | ghostfolio | 自托管投资组合 |
| finance | hummingbot | 加密做市/交易机器人 |
| finance | akaunting | 中小企业会计（BUSL） |
| blockchain | reth | Rust 以太坊执行客户端 |
| blockchain | bitcoinjs-lib | 比特币 JS 库 |
| blockchain | cometbft | BFT 共识（Tendermint 继承） |
| cms-docs | mdbook | Rust Markdown 书 |
| cms-docs | bookstack | 层级知识库（Codeberg） |
| cms-docs | wikijs | Node Wiki |
| cms-docs | quarto | 科学出版 |

## 边密度

四域补 `alternative_to` / `depends_on` / `integrates_with`（batch8 density）。

## 仍不录 / 暂缓

| name | reason |
|---|---|
| Outline | BUSL「Document Service」限制重，本批用 BookStack/Wiki.js 覆盖 Wiki 品类，下轮再核差异化 |
| Invoice Ninja | 与 Akaunting 重叠，下轮对照后再定 |
| Hyperledger Fabric | 企业联盟链叙事长，下轮单独写 use/avoid |
