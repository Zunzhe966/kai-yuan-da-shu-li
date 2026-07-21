# Batch 2 缺口表（web-frontend / security / observability）

- 日期：2026-07-22
- 标准：[`../inclusion-criteria.md`](../inclusion-criteria.md)

## 已补录

| domain | id | action |
|---|---|---|
| web-frontend | angular | added |
| web-frontend | preact | added |
| web-frontend | prettier | added（Biome 已在 devtools，避免重复 id） |
| web-frontend | biome | rejected-duplicate：已在 `devtools/biome` |
| web-frontend | eslint | added |
| security | falco | added |
| security | crowdsec | added |
| security | oauth2-proxy | added |
| security | casbin | added |
| observability | netdata | added |
| observability | skywalking | added |
| observability | openobserve | added |

## 暂缓

| domain | name_or_query | reason | reviewed_at |
|---|---|---|---|
| web-frontend | SolidJS / Qwik | deferred：元框架密度已升，下轮再对照 | 2026-07-22 |
| web-frontend | Jest | deferred：与 Vitest 替代关系待写清 | 2026-07-22 |
| security | Teleport | deferred：体量大，需单独 use/avoid | 2026-07-22 |
| security | Suricata | deferred：网络 IDS 与 CrowdSec 边界待定 | 2026-07-22 |
| observability | GlitchTip | deferred：上游许可/仓路径待核验 | 2026-07-22 |
| observability | Zabbix | deferred：传统监控品类，下轮 | 2026-07-22 |
