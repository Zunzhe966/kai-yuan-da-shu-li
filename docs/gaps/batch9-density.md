# Batch 9：networking / observability / security 密度与暂缓清零

- 日期：2026-07-22
- 对应：S12

## 补录

| domain | id | 品类补洞 |
|---|---|---|
| networking | frr | 动态路由套件 |
| networking | bird | 轻量 BGP 守护 |
| networking | metallb | 裸机 K8s LB |
| networking | openvswitch | 可编程虚拟交换机 |
| networking | strongswan | IPsec VPN |
| networking | dnsmasq | 轻量 DNS/DHCP |
| observability | victoria-logs | VictoriaMetrics 日志 |
| observability | librenms | 网络设备 NMS |
| security | vaultwarden | 自托管口令服务端 |
| security | keepassxc | 本地口令库 |
| security | wazuh | SIEM/XDR |
| security | checkov | IaC 扫描 |
| security | defectdojo | 漏洞管理平台 |

## 暂缓清零（已在图谱 / 已记账）

| 项 | 状态 |
|---|---|
| Teleport / Suricata | 已在 security 正式节点 |
| linkerd | 已在 networking 为 linkerd2 |
| Zabbix | 已在 observability |
| GlitchTip | 维持 rejected（上游停滞，见 batch6） |

## 仍暂缓

| name | reason |
|---|---|
| falcosidekick | Falco 侧车通知层，下轮与 Falco 边一起核 |
| Bitwarden 官方服务端 | 与 Vaultwarden 对照后再写差异化 |
