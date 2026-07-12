# 开源大梳理 · observability

## OpenTelemetry

- [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector) — 厂商中立的遥测数据采集、处理与导出管道。

## 链路追踪

- [Jaeger](https://github.com/jaegertracing/jaeger) — 分布式追踪系统。
- [Zipkin](https://github.com/openzipkin/zipkin) — 经典分布式追踪系统。
- [Grafana Tempo](https://github.com/grafana/tempo) — 高基数友好的分布式追踪后端。

## 指标存储

- [Grafana Mimir](https://github.com/grafana/mimir) — 长期可扩展的 Prometheus 兼容指标后端。
- [Thanos](https://github.com/thanos-io/thanos) — Prometheus 高可用与长期存储组件。
- [VictoriaMetrics](https://github.com/VictoriaMetrics/VictoriaMetrics) — 高性能、低成本的 Prometheus 兼容时序库。

## 日志

- [Grafana Loki](https://github.com/grafana/loki) — 像 Prometheus 一样的日志聚合系统。
- [OpenSearch](https://github.com/opensearch-project/opensearch) — Elasticsearch 开源分支，搜索与分析。
- [Graylog](https://github.com/Graylog2/graylog2-server) — 集中式日志管理平台。

## 采集与管道

- [Fluent Bit](https://github.com/fluent/fluent-bit) — 轻量日志/指标转发代理。
- [Fluentd](https://github.com/fluent/fluentd) — 统一日志层，插件丰富。
- [Vector](https://github.com/vectordotdev/vector) — 高性能可观测数据管道（日志/指标）。
- [Grafana Alloy](https://github.com/grafana/alloy) — Grafana 开源遥测采集器（Agent 后继）。

## APM / 错误 / Profiling

- [Sentry](https://github.com/getsentry/sentry) — 应用错误监控与性能追踪平台。
- [SigNoz](https://github.com/SigNoz/signoz) — 开源 APM，基于 OpenTelemetry。
- [Pyroscope](https://github.com/grafana/pyroscope) — 持续性能分析（profiling）平台。

## 可用性

- [Uptime Kuma](https://github.com/louislam/uptime-kuma) — 自托管监控与状态页。


> 相关：`prometheus`/`grafana` 见 devops；`elasticsearch` 见 databases；`opentelemetry-python` 见 ai-agents。

