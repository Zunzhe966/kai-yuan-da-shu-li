# Agent retrieval eval v1

协议：AGENTS.md（全域检索 → tags + use_when/avoid_when 重排 → 1–3 推荐）

默认 `domain=all`（模拟 Agent 不预先知道垂直域）。

| ID | Query | Top推荐 | 命中期望 | 合规 |
|---|---|---|---|---|
| q1 | 我想做多 Agent 角色分工协作，Python | openai-agents-python, autogen, metagpt | Y | Y |
| q2 | 本地笔记本快速跑开源模型聊天 | ollama, open-webui, llama-cpp | Y | Y |
| q3 | GPU 服务器高并发自托管推理 | vllm, sglang, llama-cpp | Y | Y |
| q4 | 做文档问答 RAG，偏数据连接与索引 | haystack, dify, crawl4ai | Y | Y |
| q5 | 需要向量库，先快速原型 | lancedb, chromadb, qdrant | Y | Y |
| q6 | 生产环境要带过滤条件的向量检索 | weaviate, qdrant, pgvector | Y | Y |
| q7 | 给 Agent 接 MCP 工具 | modelcontextprotocol-servers, mcp-python-sdk, kaiyuan-dashuli | Y | Y |
| q8 | 追踪生产环境 LLM 调用和提示版本 | langfuse, opentelemetry-python, trulens | Y | Y |
| q9 | 把 RAG 质量纳入自动评测 | ragas, trulens, haystack | Y | Y |
| q10 | 只要强类型结构化输出，不要重型 Agent 框架 | instructor, pydantic-ai, promptfoo | Y | Y |
| q11 | VS Code 里开源编码助手 | continue, vercel-ai, swiftui-notes | Y | Y |
| q12 | 统一多个模型供应商的 API 路由 | localai, litellm, vllm | Y | Y |
| q13 | Kubernetes 上做 GitOps 持续交付 | flux2, argo-cd, tekton | Y | Y |
| q14 | 不想上满血 K8s，只要轻量工作负载调度 | nomad, linkerd, k3s | Y | Y |
| q15 | 基础设施即代码，团队更熟 Python/TS | pulumi, terraform, vault | Y | Y |
| q16 | React 项目要 SSR 和文件系统路由 | nextjs, remix, nuxt | Y | Y |
| q17 | 前端要快速本地开发和现代打包 | vite, webpack | Y | Y |
| q18 | 多浏览器端到端测试 | playwright, cypress, vitest | Y | Y |
| q19 | 嵌入式单文件 SQL 数据库 | sqlite, postgresql, tidb | Y | Y |
| q20 | 低延迟缓存和会话存储 | redis, keydb, valkey | Y | Y |
| q21 | 大量事件明细做分析查询 | duckdb, clickhouse, timescaledb | Y | Y |
| q22 | CI 里扫描容器镜像漏洞 | trivy, grype, gitleaks | Y | Y |
| q23 | 防止 Git 仓库密钥泄漏 | gitleaks, sops, vault-hashicorp | Y | Y |
| q24 | 生成软件物料清单 SBOM | syft, grype | Y | Y |
| q25 | Python 要类型友好的高性能 HTTP API | fastapi, flask, django | Y | Y |
| q26 | Node TypeScript 企业级模块化后端 | nestjs, express, hono | Y | Y |
| q27 | Python 分布式后台任务队列 | celery, bullmq, ruff | Y | Y |
| q28 | 一套代码做 Android 和 iOS 跨平台 UI | flutter, react-native, expo | Y | Y |
| q29 | React 团队做移动端并要快速迭代 | react-native, expo, detox | Y | Y |
| q30 | 移动应用端到端自动化测试 | detox, appium, playwright | Y | Y |
| q31 | Python 表格 DataFrame 处理 | pandas, polars, geopandas | Y | Y |
| q32 | 深度学习训练框架 | tensorflow, pytorch, jax | Y | Y |
| q33 | 机器学习实验跟踪和模型注册 | mlflow, feast | Y | Y |
| q34 | 代码库正则快速搜索 | ripgrep, fzf, fd | Y | Y |
| q35 | 交互式模糊查找文件 | fzf, ripgrep, fd | Y | Y |
| q36 | 极速 Python 包管理和虚拟环境 | uv, ruff, rasterio | Y | Y |
| q37 | 用 Web 技术做跨平台桌面应用 | electron, nwjs, wails | Y | Y |
| q38 | 轻量桌面客户端不要捆绑 Chromium | wails, tauri, electron | Y | Y |
| q39 | Python 做桌面 GUI | pyqt, pyside, dearpygui | Y | Y |
| q40 | React 产品文档站生成器 | docusaurus, nextra, vitepress | Y | Y |
| q41 | 自托管无头 CMS | strapi, payload, keystone | Y | Y |
| q42 | 极速静态站点生成器做博客 | jekyll, hugo, starlight | Y | Y |
| q43 | 云原生动态 API 网关 | apisix, kong, retrofit | Y | Y |
| q44 | 基于 WireGuard 的零配置组网 | tailscale, netbird, headscale | Y | Y |
| q45 | 把内网服务穿透到公网 | gost, frp, cloudflared | Y | Y |
| q46 | 移动端 UI 自动化测试不要太重 | maestro, detox, appium | Y | Y |
| q47 | Flutter 应用代码热更新 | shorebird, flutter-desktop, flutter | Y | Y |
| q48 | Kotlin 多平台共享业务逻辑 | kmp, ktor, kotlin-android | Y | Y |
| q49 | 开源分布式链路追踪 | zipkin, tempo, jaeger | Y | Y |
| q50 | 与 Grafana 配套的日志聚合 | loki, opensearch, graylog | Y | Y |
| q51 | 应用错误监控与聚合 | sentry, signoz, zipkin | Y | Y |
| q52 | 自托管智能家居家庭自动化中枢 | openhab, home-assistant, nodered | Y | Y |
| q53 | YAML 配置刷 ESP 传感器固件 | esphome, tasmota, esp-idf | Y | Y |
| q54 | 轻量自托管 MQTT broker | emqx, mosquitto, zigbee2mqtt | Y | Y |
| q55 | 命令行音视频转码处理 | handbrake, gstreamer, ffmpeg | Y | Y |
| q56 | 开源直播推流和录屏 | obs-studio, yt-dlp, whisper-cpp | Y | Y |
| q57 | 自托管影视媒体服务器 | navidrome, jellyfin, yt-dlp | Y | Y |
| q58 | 开源游戏引擎做 2D 和 3D | godot, monogame, bevy | Y | Y |
| q59 | 浏览器 HTML5 2D 游戏框架 | phaser, threejs, babylonjs | Y | Y |
| q60 | 浏览器 Web 3D 渲染库 | threejs, babylonjs, bullet3 | Y | Y |
| q61 | 开源桌面 GIS 制图软件 | qgis, grass-gis, openlayers | Y | Y |
| q62 | 网页嵌入轻量交互地图 | leaflet, openlayers, maplibre-gl | Y | Y |
| q63 | PostgreSQL 空间数据库扩展 | postgis, turfjs, tippecanoe | Y | Y |
| q64 | 开源加密货币交易机器人 | freqtrade, ccxt, hummingbot | Y | Y |
| q65 | Python 量化策略回测框架 | backtrader, zipline-reloaded, vectorbt | Y | Y |
| q66 | 自托管个人记账和预算 | ghostfolio, firefly-iii, actual-budget | Y | Y |
| q67 | Solidity 合约需要高速本地测试和脚本化部署 | foundry, hardhat, solidity | Y | Y |

**通过率：67/67 = 100%**

判定阈值：≥80%

## 逐条取舍摘要

### q1 — 我想做多 Agent 角色分工协作，Python
- **OpenAI Agents SDK** (`openai-agents-python` / ai-agents)
  - use_when: 主要走 OpenAI 模型与官方 Agent 抽象
  - avoid_when: 必须厂商中立、避免绑定 OpenAI API 形态
  - repo: https://github.com/openai/openai-agents-python
- **AutoGen** (`autogen` / ai-agents)
  - use_when: 需要多角色 Agent 对话协作原型
  - avoid_when: 只要单 Agent 工具调用，不想引入多 Agent 复杂度
  - repo: https://github.com/microsoft/autogen
- **MetaGPT** (`metagpt` / ai-agents)
  - use_when: 用多角色流水线生成软件方案/代码原型
  - avoid_when: 任务简单不需要「虚拟公司」开销
  - repo: https://github.com/FoundationAgents/MetaGPT
- result: PASS (hit=True, compliant=True)

### q2 — 本地笔记本快速跑开源模型聊天
- **Ollama** (`ollama` / ai-agents)
  - use_when: 本地/内网推理、快速试用开源模型
  - avoid_when: 需要大规模分布式推理集群（应看 vLLM 等）
  - repo: https://github.com/ollama/ollama
- **Open WebUI** (`open-webui` / ai-agents)
  - use_when: 给本地/私有模型一个好用聊天界面
  - avoid_when: 只要 API 不要前端
  - repo: https://github.com/open-webui/open-webui
- **llama.cpp** (`llama-cpp` / ai-agents)
  - use_when: CPU/消费级 GPU 本地跑量化模型、嵌入式部署
  - avoid_when: 需要多租户高并发 OpenAI 兼容服务集群
  - repo: https://github.com/ggml-org/llama.cpp
- result: PASS (hit=True, compliant=True)

### q3 — GPU 服务器高并发自托管推理
- **vLLM** (`vllm` / ai-agents)
  - use_when: GPU 集群/服务器上要高并发开源模型推理
  - avoid_when: 笔记本一键试用（更看 Ollama）
  - repo: https://github.com/vllm-project/vllm
- **SGLang** (`sglang` / ai-agents)
  - use_when: 自托管推理且在意结构化解码/吞吐
  - avoid_when: 只要最简单本地聊天
  - repo: https://github.com/sgl-project/sglang
- **llama.cpp** (`llama-cpp` / ai-agents)
  - use_when: CPU/消费级 GPU 本地跑量化模型、嵌入式部署
  - avoid_when: 需要多租户高并发 OpenAI 兼容服务集群
  - repo: https://github.com/ggml-org/llama.cpp
- result: PASS (hit=True, compliant=True)

### q4 — 做文档问答 RAG，偏数据连接与索引
- **Haystack** (`haystack` / ai-agents)
  - use_when: 生产向 RAG 管道、组件可替换
  - avoid_when: 只要最薄的向量检索包装
  - repo: https://github.com/deepset-ai/haystack
- **Dify** (`dify` / ai-agents)
  - use_when: 要快速搭可运营的 Agent/RAG 工作台且可自托管
  - avoid_when: 只要代码库级框架、不要产品化控制台
  - repo: https://github.com/langgenius/dify
- **Crawl4AI** (`crawl4ai` / ai-agents)
  - use_when: Agent/RAG 需要干净网页语料
  - avoid_when: 只要单一 API 数据源
  - repo: https://github.com/unclecode/crawl4ai
- result: PASS (hit=True, compliant=True)

### q5 — 需要向量库，先快速原型
- **LanceDB** (`lancedb` / ai-agents)
  - use_when: 嵌入式/湖仓一体的向量与多模态检索
  - avoid_when: 只要经典独立向量服务
  - repo: https://github.com/lancedb/lancedb
- **Chroma** (`chromadb` / ai-agents)
  - use_when: 快速原型 RAG、本地/轻量向量存储
  - avoid_when: 超大规模分布式检索（看 Milvus/Qdrant）
  - repo: https://github.com/chroma-core/chroma
- **Qdrant** (`qdrant` / ai-agents)
  - use_when: 需要可过滤的向量检索与较稳的生产部署
  - avoid_when: 只要进程内玩具级向量表
  - repo: https://github.com/qdrant/qdrant
- result: PASS (hit=True, compliant=True)

### q6 — 生产环境要带过滤条件的向量检索
- **Weaviate** (`weaviate` / ai-agents)
  - use_when: 需要带模块/混合检索的向量库
  - avoid_when: 只要嵌入式玩具级向量表
  - repo: https://github.com/weaviate/weaviate
- **Qdrant** (`qdrant` / ai-agents)
  - use_when: 需要可过滤的向量检索与较稳的生产部署
  - avoid_when: 只要进程内玩具级向量表
  - repo: https://github.com/qdrant/qdrant
- **pgvector** (`pgvector` / databases)
  - use_when: 已有 Postgres、向量量级中等、想少引入独立向量库
  - avoid_when: 超大规模向量检索要专用引擎（Milvus/Qdrant 等）
  - repo: https://github.com/pgvector/pgvector
- result: PASS (hit=True, compliant=True)

### q7 — 给 Agent 接 MCP 工具
- **Model Context Protocol Servers** (`modelcontextprotocol-servers` / ai-agents)
  - use_when: 需要按 MCP 标准给 Agent 挂工具
  - avoid_when: 不使用 MCP，只要自定义 function calling
  - repo: https://github.com/modelcontextprotocol/servers
- **MCP Python SDK** (`mcp-python-sdk` / ai-agents)
  - use_when: 要用 Python 实现 MCP client/server
  - avoid_when: 不采用 MCP，只用私有 function calling
  - repo: https://github.com/modelcontextprotocol/python-sdk
- **开源大梳理** (`kaiyuan-dashuli` / ai-agents)
  - use_when: 需要先定位该用哪个开源项目/栈，而不是直接关键词海搜
  - avoid_when: 已明确唯一上游仓库，只需读其 README
  - repo: https://github.com/Zunzhe966/kai-yuan-da-shu-li
- result: PASS (hit=True, compliant=True)

### q8 — 追踪生产环境 LLM 调用和提示版本
- **Langfuse** (`langfuse` / ai-agents)
  - use_when: 要追踪生产 LLM 调用与提示版本
  - avoid_when: 本地一次性脚本无需观测
  - repo: https://github.com/langfuse/langfuse
- **OpenTelemetry Python** (`opentelemetry-python` / ai-agents)
  - use_when: 要把 LLM 服务接入标准 tracing/metrics
  - avoid_when: 只要 LLM 专用控制台、不接通用 OTel
  - repo: https://github.com/open-telemetry/opentelemetry-python
- **TruLens** (`trulens` / ai-agents)
  - use_when: 要把 RAG/Agent 质量评估接到应用反馈闭环
  - avoid_when: 只要基准跑分（lm-eval）或提示词红队（promptfoo）
  - repo: https://github.com/truera/trulens
- result: PASS (hit=True, compliant=True)

### q9 — 把 RAG 质量纳入自动评测
- **Ragas** (`ragas` / ai-agents)
  - use_when: 要量化 RAG 忠实度/相关性等指标
  - avoid_when: 还没有可跑的 RAG 流水线
  - repo: https://github.com/explodinggradients/ragas
- **TruLens** (`trulens` / ai-agents)
  - use_when: 要把 RAG/Agent 质量评估接到应用反馈闭环
  - avoid_when: 只要基准跑分（lm-eval）或提示词红队（promptfoo）
  - repo: https://github.com/truera/trulens
- **Haystack** (`haystack` / ai-agents)
  - use_when: 生产向 RAG 管道、组件可替换
  - avoid_when: 只要最薄的向量检索包装
  - repo: https://github.com/deepset-ai/haystack
- result: PASS (hit=True, compliant=True)

### q10 — 只要强类型结构化输出，不要重型 Agent 框架
- **Instructor** (`instructor` / ai-agents)
  - use_when: 只要可靠 JSON/结构化对象，不要整套 Agent 框架
  - avoid_when: 需要完整多 Agent 运行时
  - repo: https://github.com/instructor-ai/instructor
- **Pydantic AI** (`pydantic-ai` / ai-agents)
  - use_when: 要强类型、依赖注入式 Agent 与结构化结果
  - avoid_when: 需要巨型现成集成市场
  - repo: https://github.com/pydantic/pydantic-ai
- **promptfoo** (`promptfoo` / ai-agents)
  - use_when: 要把提示词/Agent 行为做成可回归的评测与对比
  - avoid_when: 只要一次性手工试聊
  - repo: https://github.com/promptfoo/promptfoo
- result: PASS (hit=True, compliant=True)

### q11 — VS Code 里开源编码助手
- **Continue** (`continue` / ai-agents)
  - use_when: 要在 VS Code/JetBrains 里开源可控的编码助手
  - avoid_when: 只要无 IDE 的纯 API Agent
  - repo: https://github.com/continuedev/continue
- **Vercel AI SDK** (`vercel-ai` / ai-agents)
  - use_when: Next.js/Web 流式聊天与工具调用
  - avoid_when: 后端批处理/非 TS 栈
  - repo: https://github.com/vercel/ai
- **Hacking with Swift** (`swiftui-notes` / mobile)
  - use_when: 学/做 SwiftUI 界面
  - avoid_when: 非 Apple UI
  - repo: https://github.com/twostraws/HackingWithSwift
- result: PASS (hit=True, compliant=True)

### q12 — 统一多个模型供应商的 API 路由
- **LocalAI** (`localai` / ai-agents)
  - use_when: 要 OpenAI 兼容本地 API、硬件杂、模型种类多
  - avoid_when: 只要极简一键聊天（可先看 Ollama）
  - repo: https://github.com/mudler/LocalAI
- **LiteLLM** (`litellm` / ai-agents)
  - use_when: 要一套接口打多个模型供应商并做路由/限流
  - avoid_when: 只用单一官方 SDK 且无路由需求
  - repo: https://github.com/BerriAI/litellm
- **vLLM** (`vllm` / ai-agents)
  - use_when: GPU 集群/服务器上要高并发开源模型推理
  - avoid_when: 笔记本一键试用（更看 Ollama）
  - repo: https://github.com/vllm-project/vllm
- result: PASS (hit=True, compliant=True)

### q13 — Kubernetes 上做 GitOps 持续交付
- **Flux** (`flux2` / devops)
  - use_when: K8s GitOps 且偏 Flux 生态
  - avoid_when: 已选定 Argo CD 且无双栈需求
  - repo: https://github.com/fluxcd/flux2
- **Argo CD** (`argo-cd` / devops)
  - use_when: 要用 Git 作为 K8s 期望状态源
  - avoid_when: 不用 Kubernetes 或不做 GitOps
  - repo: https://github.com/argoproj/argo-cd
- **Tekton** (`tekton` / devops)
  - use_when: 流水线要声明在集群内、以 CRD 方式编排
  - avoid_when: 只要经典 Jenkins 插件或托管 GitHub Actions
  - repo: https://github.com/tektoncd/pipeline
- result: PASS (hit=True, compliant=True)

### q14 — 不想上满血 K8s，只要轻量工作负载调度
- **Nomad** (`nomad` / devops)
  - use_when: 要调度容器/非容器任务又不想上满血 K8s
  - avoid_when: 团队标准已是 Kubernetes 且生态绑定深
  - repo: https://github.com/hashicorp/nomad
- **Linkerd** (`linkerd` / devops)
  - use_when: 要 K8s 网格能力但希望比 Istio 更轻、运维面更小
  - avoid_when: 要最全流量治理与庞大插件生态（看 Istio）
  - repo: https://github.com/linkerd/linkerd2
- **K3s** (`k3s` / devops)
  - use_when: 边缘/小团队要完整 K8s API 但安装要轻
  - avoid_when: 超大规模多租户管控面（看上游 Kubernetes/发行版）
  - repo: https://github.com/k3s-io/k3s
- result: PASS (hit=True, compliant=True)

### q15 — 基础设施即代码，团队更熟 Python/TS
- **Pulumi** (`pulumi` / devops)
  - use_when: 团队更想用熟悉语言而不是 HCL 写基础设施
  - avoid_when: 已深度绑定 Terraform 生态且无语言 IaC 需求
  - repo: https://github.com/pulumi/pulumi
- **Terraform** (`terraform` / devops)
  - use_when: 要用代码管理云资源与基础设施
  - avoid_when: 只改几台机器配置、无云 API 需求
  - repo: https://github.com/hashicorp/terraform
- **Vault** (`vault` / devops)
  - use_when: 要统一管理密钥、动态凭证、加密即服务
  - avoid_when: 只用云厂商密钥管理且无多云密钥需求
  - repo: https://github.com/hashicorp/vault
- result: PASS (hit=True, compliant=True)

### q16 — React 项目要 SSR 和文件系统路由
- **Next.js** (`nextjs` / web-frontend)
  - use_when: React 项目需要路由/SSR/全栈约定
  - avoid_when: 只要纯 CSR 且不想要框架约定
  - repo: https://github.com/vercel/next.js
- **Remix** (`remix` / web-frontend)
  - use_when: 重视渐进增强、嵌套路由与 Web fetch 模型
  - avoid_when: 只要最大众的 Next 约定与教程密度
  - repo: https://github.com/remix-run/remix
- **Nuxt** (`nuxt` / web-frontend)
  - use_when: Vue 项目需要约定式全栈/SSR
  - avoid_when: 不用 Vue
  - repo: https://github.com/nuxt/nuxt
- result: PASS (hit=True, compliant=True)

### q17 — 前端要快速本地开发和现代打包
- **Vite** (`vite` / web-frontend)
  - use_when: 要快速本地开发与现代打包
  - avoid_when: 维护老旧 webpack-only 流水线且无迁移窗口
  - repo: https://github.com/vitejs/vite
- **webpack** (`webpack` / web-frontend)
  - use_when: 要深度定制打包或兼容既有 webpack 配置
  - avoid_when: 新项目更想零配置快速体验（看 Vite）
  - repo: https://github.com/webpack/webpack
- result: PASS (hit=True, compliant=True)

### q18 — 多浏览器端到端测试
- **Playwright** (`playwright` / web-frontend)
  - use_when: 要可靠的端到端/多浏览器自动化
  - avoid_when: 只要组件单测、不测真实浏览器
  - repo: https://github.com/microsoft/playwright
- **Cypress** (`cypress` / web-frontend)
  - use_when: 团队熟悉 Cypress 工作流与时间旅行调试
  - avoid_when: 需要多浏览器引擎一等支持（更看 Playwright）
  - repo: https://github.com/cypress-io/cypress
- **Vitest** (`vitest` / web-frontend)
  - use_when: Vite 项目要快速单测
  - avoid_when: 非 Vite 且已深度绑定 Jest
  - repo: https://github.com/vitest-dev/vitest
- result: PASS (hit=True, compliant=True)

### q19 — 嵌入式单文件 SQL 数据库
- **SQLite** (`sqlite` / databases)
  - use_when: 嵌入式/本地/测试要零运维 SQL
  - avoid_when: 需要多写高并发网络数据库服务
  - repo: https://github.com/sqlite/sqlite
- **PostgreSQL** (`postgresql` / databases)
  - use_when: 需要可靠通用 SQL 数据库与强生态
  - avoid_when: 只要嵌入式单文件库
  - repo: https://github.com/postgres/postgres
- **TiDB** (`tidb` / databases)
  - use_when: 要 MySQL 兼容的分布式扩展
  - avoid_when: 无分布式需求
  - repo: https://github.com/pingcap/tidb
- result: PASS (hit=True, compliant=True)

### q20 — 低延迟缓存和会话存储
- **Redis** (`redis` / databases)
  - use_when: 要低延迟缓存、会话、简单队列
  - avoid_when: 主要需求是大容量持久关系数据
  - repo: https://github.com/redis/redis
- **KeyDB** (`keydb` / databases)
  - use_when: 要 Redis 兼容且更高多核吞吐
  - avoid_when: 标准 Redis 已足够
  - repo: https://github.com/Snapchat/KeyDB
- **Valkey** (`valkey` / databases)
  - use_when: 要 Redis 协议兼容缓存/实时结构且偏好社区分叉治理
  - avoid_when: 深度绑定 Redis 专有模块且无法迁移
  - repo: https://github.com/valkey-io/valkey
- result: PASS (hit=True, compliant=True)

### q21 — 大量事件明细做分析查询
- **DuckDB** (`duckdb` / databases)
  - use_when: 本地/进程内分析 SQL
  - avoid_when: 需要分布式集群 OLAP
  - repo: https://github.com/duckdb/duckdb
- **ClickHouse** (`clickhouse` / databases)
  - use_when: 大量分析查询/事件明细
  - avoid_when: 主要是 OLTP 事务业务
  - repo: https://github.com/ClickHouse/ClickHouse
- **TimescaleDB** (`timescaledb` / databases)
  - use_when: 已用 Postgres 且要以扩展做高写入时序分析
  - avoid_when: 只要纯 Apache 组件或专用时序库更简单
  - repo: https://github.com/timescale/timescaledb
- result: PASS (hit=True, compliant=True)

### q22 — CI 里扫描容器镜像漏洞
- **Trivy** (`trivy` / security)
  - use_when: CI 里扫镜像与依赖漏洞
  - avoid_when: 只要代码 SAST 不涉及供应链制品
  - repo: https://github.com/aquasecurity/trivy
- **Grype** (`grype` / security)
  - use_when: 已有 SBOM 要扫漏洞
  - avoid_when: 需要一体化容器扫描 UI
  - repo: https://github.com/anchore/grype
- **Gitleaks** (`gitleaks` / security)
  - use_when: CI/预提交要防密钥进 Git
  - avoid_when: 不做源码仓密钥检测
  - repo: https://github.com/gitleaks/gitleaks
- result: PASS (hit=True, compliant=True)

### q23 — 防止 Git 仓库密钥泄漏
- **Gitleaks** (`gitleaks` / security)
  - use_when: CI/预提交要防密钥进 Git
  - avoid_when: 不做源码仓密钥检测
  - repo: https://github.com/gitleaks/gitleaks
- **SOPS** (`sops` / security)
  - use_when: 要把密钥落 Git 但需加密
  - avoid_when: 已有完整密钥中枢且不需要文件级加密
  - repo: https://github.com/getsops/sops
- **HashiCorp Vault** (`vault-hashicorp` / security)
  - use_when: 要集中管理密钥、动态数据库凭证、加密服务
  - avoid_when: 只要云厂商单云 KMS
  - repo: https://github.com/hashicorp/vault
- result: PASS (hit=True, compliant=True)

### q24 — 生成软件物料清单 SBOM
- **Syft** (`syft` / security)
  - use_when: 要为镜像/目录生成软件物料清单
  - avoid_when: 不需要供应链清单
  - repo: https://github.com/anchore/syft
- **Grype** (`grype` / security)
  - use_when: 已有 SBOM 要扫漏洞
  - avoid_when: 需要一体化容器扫描 UI
  - repo: https://github.com/anchore/grype
- result: PASS (hit=True, compliant=True)

### q25 — Python 要类型友好的高性能 HTTP API
- **FastAPI** (`fastapi` / backend)
  - use_when: Python 要快速做类型友好的 HTTP API
  - avoid_when: 要全功能 CMS/Admin 一体（看 Django）
  - repo: https://github.com/fastapi/fastapi
- **Flask** (`flask` / backend)
  - use_when: 要最小核心可扩展的 Python Web
  - avoid_when: 要开箱即用全家桶
  - repo: https://github.com/pallets/flask
- **Django** (`django` / backend)
  - use_when: 要 ORM/Admin/认证一体的 Python Web
  - avoid_when: 只要极薄 API 层
  - repo: https://github.com/django/django
- result: PASS (hit=True, compliant=True)

### q26 — Node TypeScript 企业级模块化后端
- **NestJS** (`nestjs` / backend)
  - use_when: TypeScript Node 要模块化/依赖注入架构
  - avoid_when: 只要几行脚本起服务
  - repo: https://github.com/nestjs/nest
- **Express** (`express` / backend)
  - use_when: Node 要成熟中间件生态的 API/Web
  - avoid_when: 要强约束企业架构（看 Nest）
  - repo: https://github.com/expressjs/express
- **Hono** (`hono` / backend)
  - use_when: 要边缘/多运行时轻量 API
  - avoid_when: 需要 Nest 级大型模块体系
  - repo: https://github.com/honojs/hono
- result: PASS (hit=True, compliant=True)

### q27 — Python 分布式后台任务队列
- **Celery** (`celery` / backend)
  - use_when: Python 要异步/定时后台任务
  - avoid_when: 只要进程内轻量队列
  - repo: https://github.com/celery/celery
- **BullMQ** (`bullmq` / backend)
  - use_when: Node 要可靠后台任务（Redis）
  - avoid_when: 不用 Redis
  - repo: https://github.com/taskforcesh/bullmq
- **ruff** (`ruff` / devtools)
  - use_when: 要快速统一 Python 风格与静态检查
  - avoid_when: 依赖仅 flake8 插件生态且尚未迁移
  - repo: https://github.com/astral-sh/ruff
- result: PASS (hit=True, compliant=True)

### q28 — 一套代码做 Android 和 iOS 跨平台 UI
- **Flutter** (`flutter` / mobile)
  - use_when: 要 Android/iOS/桌面共用 UI 代码
  - avoid_when: 只要原生平台极致体验与最小包体
  - repo: https://github.com/flutter/flutter
- **React Native** (`react-native` / mobile)
  - use_when: Web React 团队要做移动端
  - avoid_when: 团队无 JS/React 经验
  - repo: https://github.com/facebook/react-native
- **Expo** (`expo` / mobile)
  - use_when: RN 要快速迭代与托管工作流
  - avoid_when: 必须深度自定义原生工程且拒绝 Expo
  - repo: https://github.com/expo/expo
- result: PASS (hit=True, compliant=True)

### q29 — React 团队做移动端并要快速迭代
- **React Native** (`react-native` / mobile)
  - use_when: Web React 团队要做移动端
  - avoid_when: 团队无 JS/React 经验
  - repo: https://github.com/facebook/react-native
- **Expo** (`expo` / mobile)
  - use_when: RN 要快速迭代与托管工作流
  - avoid_when: 必须深度自定义原生工程且拒绝 Expo
  - repo: https://github.com/expo/expo
- **Detox** (`detox` / mobile)
  - use_when: RN 应用要端到端测试
  - avoid_when: 非 RN 项目
  - repo: https://github.com/wix/Detox
- result: PASS (hit=True, compliant=True)

### q30 — 移动应用端到端自动化测试
- **Detox** (`detox` / mobile)
  - use_when: RN 应用要端到端测试
  - avoid_when: 非 RN 项目
  - repo: https://github.com/wix/Detox
- **Appium** (`appium` / mobile)
  - use_when: 原生/混合 App 要跨端自动化
  - avoid_when: 只要单元测试
  - repo: https://github.com/appium/appium
- **Playwright** (`playwright` / web-frontend)
  - use_when: 要可靠的端到端/多浏览器自动化
  - avoid_when: 只要组件单测、不测真实浏览器
  - repo: https://github.com/microsoft/playwright
- result: PASS (hit=True, compliant=True)

### q31 — Python 表格 DataFrame 处理
- **pandas** (`pandas` / data-ml)
  - use_when: Python 做表格数据处理与分析
  - avoid_when: 超大规模分布式表处理（看 Spark/Polars）
  - repo: https://github.com/pandas-dev/pandas
- **Polars** (`polars` / data-ml)
  - use_when: 要比 pandas 更快的本地/懒执行表处理
  - avoid_when: 只要最大学术/教程生态
  - repo: https://github.com/pola-rs/polars
- **GeoPandas** (`geopandas` / gis)
  - use_when: Python 里做矢量数据分析
  - avoid_when: 超大规模需分布式空间计算
  - repo: https://github.com/geopandas/geopandas
- result: PASS (hit=True, compliant=True)

### q32 — 深度学习训练框架
- **TensorFlow** (`tensorflow` / data-ml)
  - use_when: TF/Keras 生态或移动/嵌入部署路径
  - avoid_when: 团队标准已是 PyTorch
  - repo: https://github.com/tensorflow/tensorflow
- **PyTorch** (`pytorch` / data-ml)
  - use_when: 研究/生产深度学习与自定义训练
  - avoid_when: 只要经典 ML 不碰神经网络
  - repo: https://github.com/pytorch/pytorch
- **JAX** (`jax` / data-ml)
  - use_when: 要函数式/可微科学计算与加速
  - avoid_when: 只要高层 Keras 式 API
  - repo: https://github.com/jax-ml/jax
- result: PASS (hit=True, compliant=True)

### q33 — 机器学习实验跟踪和模型注册
- **MLflow** (`mlflow` / data-ml)
  - use_when: 要记录实验/模型注册
  - avoid_when: 一次性脚本无实验管理需求
  - repo: https://github.com/mlflow/mlflow
- **Feast** (`feast` / data-ml)
  - use_when: 在线/离线特征需要统一管理
  - avoid_when: 特征很少、无服务化需求
  - repo: https://github.com/feast-dev/feast
- result: PASS (hit=True, compliant=True)

### q34 — 代码库正则快速搜索
- **ripgrep** (`ripgrep` / devtools)
  - use_when: 需要在代码库里快速按正则找内容
  - avoid_when: 只要简单字符串匹配且不在意速度
  - repo: https://github.com/BurntSushi/ripgrep
- **fzf** (`fzf` / devtools)
  - use_when: 交互式从列表/历史/文件中模糊挑选
  - avoid_when: 非交互批处理且无需人机选择
  - repo: https://github.com/junegunn/fzf
- **fd** (`fd` / devtools)
  - use_when: 按文件名/路径模式快速定位文件
  - avoid_when: 需要 find 全部冷门谓词与复杂表达式
  - repo: https://github.com/sharkdp/fd
- result: PASS (hit=True, compliant=True)

### q35 — 交互式模糊查找文件
- **fzf** (`fzf` / devtools)
  - use_when: 交互式从列表/历史/文件中模糊挑选
  - avoid_when: 非交互批处理且无需人机选择
  - repo: https://github.com/junegunn/fzf
- **ripgrep** (`ripgrep` / devtools)
  - use_when: 需要在代码库里快速按正则找内容
  - avoid_when: 只要简单字符串匹配且不在意速度
  - repo: https://github.com/BurntSushi/ripgrep
- **fd** (`fd` / devtools)
  - use_when: 按文件名/路径模式快速定位文件
  - avoid_when: 需要 find 全部冷门谓词与复杂表达式
  - repo: https://github.com/sharkdp/fd
- result: PASS (hit=True, compliant=True)

### q36 — 极速 Python 包管理和虚拟环境
- **uv** (`uv` / devtools)
  - use_when: 要快的 venv/依赖解析/锁文件工作流
  - avoid_when: 必须兼容遗留纯 pip/poetry 流程且无迁移窗口
  - repo: https://github.com/astral-sh/uv
- **ruff** (`ruff` / devtools)
  - use_when: 要快速统一 Python 风格与静态检查
  - avoid_when: 依赖仅 flake8 插件生态且尚未迁移
  - repo: https://github.com/astral-sh/ruff
- **rasterio** (`rasterio` / gis)
  - use_when: Python 读写处理栅格数据
  - avoid_when: 只要矢量分析
  - repo: https://github.com/rasterio/rasterio
- result: PASS (hit=True, compliant=True)

### q37 — 用 Web 技术做跨平台桌面应用
- **Electron** (`electron` / desktop)
  - use_when: 要用 Web 技术快速做桌面客户端且接受体积
  - avoid_when: 要极小包体与原生性能优先
  - repo: https://github.com/electron/electron
- **NW.js** (`nwjs` / desktop)
  - use_when: 要 Web 技术做桌面且需要从页面直接访问 Node API
  - avoid_when: 要更小体积与更强进程隔离（优先 Tauri/Wails）
  - repo: https://github.com/nwjs/nw.js
- **Wails** (`wails` / desktop)
  - use_when: 后端想用 Go 且要桌面壳
  - avoid_when: 团队主栈是 Rust/TS 且已选定 Tauri/Electron
  - repo: https://github.com/wailsapp/wails
- result: PASS (hit=True, compliant=True)

### q38 — 轻量桌面客户端不要捆绑 Chromium
- **Wails** (`wails` / desktop)
  - use_when: 后端想用 Go 且要桌面壳
  - avoid_when: 团队主栈是 Rust/TS 且已选定 Tauri/Electron
  - repo: https://github.com/wailsapp/wails
- **Tauri** (`tauri` / desktop)
  - use_when: 要更小安装包与更强系统安全边界的桌面应用
  - avoid_when: 深度依赖 Electron 专用生态与 Node 原生模块
  - repo: https://github.com/tauri-apps/tauri
- **Electron** (`electron` / desktop)
  - use_when: 要用 Web 技术快速做桌面客户端且接受体积
  - avoid_when: 要极小包体与原生性能优先
  - repo: https://github.com/electron/electron
- result: PASS (hit=True, compliant=True)

### q39 — Python 做桌面 GUI
- **PyQt** (`pyqt` / desktop)
  - use_when: Python 做功能完整桌面 GUI
  - avoid_when: 要避开 GPL/商业许可复杂度
  - repo: https://www.riverbankcomputing.com/software/pyqt/
- **PySide (Qt for Python)** (`pyside` / desktop)
  - use_when: Python + Qt 且偏好官方绑定许可路径
  - avoid_when: 只要极简脚本弹窗
  - repo: https://github.com/pyside/pyside-setup
- **Dear PyGui** (`dearpygui` / desktop)
  - use_when: Python 工具/可视化要高刷新 UI
  - avoid_when: 要原生系统控件与标准桌面观感
  - repo: https://github.com/hoffstadt/DearPyGui
- result: PASS (hit=True, compliant=True)

### q40 — React 产品文档站生成器
- **Docusaurus** (`docusaurus` / cms-docs)
  - use_when: 要版本化产品文档站且用 React
  - avoid_when: 只要极简 Markdown 预览
  - repo: https://github.com/facebook/docusaurus
- **Nextra** (`nextra` / cms-docs)
  - use_when: Next.js 团队要文档/知识库站
  - avoid_when: 不想依赖 Next
  - repo: https://github.com/shuding/nextra
- **VitePress** (`vitepress` / cms-docs)
  - use_when: Vue/Vite 生态要快速文档站
  - avoid_when: 要强版本化与庞大插件市场
  - repo: https://github.com/vuejs/vitepress
- result: PASS (hit=True, compliant=True)

### q41 — 自托管无头 CMS
- **Strapi** (`strapi` / cms-docs)
  - use_when: 要自托管无头 CMS 给多前端供内容
  - avoid_when: 只要 Git 驱动的文档站
  - repo: https://github.com/strapi/strapi
- **Payload** (`payload` / cms-docs)
  - use_when: TS 团队要代码优先的无头 CMS
  - avoid_when: 非 Node/TS 栈
  - repo: https://github.com/payloadcms/payload
- **Keystone** (`keystone` / cms-docs)
  - use_when: 要 GraphQL 内容 API 与自定义字段
  - avoid_when: 只要最简 Markdown 文档
  - repo: https://github.com/keystonejs/keystone
- result: PASS (hit=True, compliant=True)

### q42 — 极速静态站点生成器做博客
- **Jekyll** (`jekyll` / cms-docs)
  - use_when: 要贴合 GitHub Pages 的博客/文档
  - avoid_when: 要现代 JS 工具链与组件
  - repo: https://github.com/jekyll/jekyll
- **Hugo** (`hugo` / cms-docs)
  - use_when: 要极快构建的博客/文档/营销页
  - avoid_when: 要强 React 组件化页面
  - repo: https://github.com/gohugoio/hugo
- **Starlight** (`starlight` / cms-docs)
  - use_when: 用 Astro 做产品文档站
  - avoid_when: 非 Astro 栈
  - repo: https://github.com/withastro/starlight
- result: PASS (hit=True, compliant=True)

### q43 — 云原生动态 API 网关
- **Apache APISIX** (`apisix` / networking)
  - use_when: 要动态配置的 API 网关与插件生态
  - avoid_when: 只要单机 nginx 反代几个路径
  - repo: https://github.com/apache/apisix
- **Kong** (`kong` / networking)
  - use_when: 要插件化 API 网关与企业能力
  - avoid_when: 网关需求极简且团队无 OpenResty 经验
  - repo: https://github.com/Kong/kong
- **Retrofit** (`retrofit` / mobile)
  - use_when: Android 要声明式 API 客户端
  - avoid_when: 非 JVM
  - repo: https://github.com/square/retrofit
- result: PASS (hit=True, compliant=True)

### q44 — 基于 WireGuard 的零配置组网
- **Tailscale** (`tailscale` / networking)
  - use_when: 要轻松把设备组进私有网络
  - avoid_when: 必须完全自建控制面且无 SaaS
  - repo: https://github.com/tailscale/tailscale
- **NetBird** (`netbird` / networking)
  - use_when: 要开源零信任网状 VPN 替代
  - avoid_when: 已绑定 Tailscale 生态
  - repo: https://github.com/netbirdio/netbird
- **Headscale** (`headscale` / networking)
  - use_when: 要用 Tailscale 客户端但自建协调服务
  - avoid_when: 接受官方托管控制面即可
  - repo: https://github.com/juanfont/headscale
- result: PASS (hit=True, compliant=True)

### q45 — 把内网服务穿透到公网
- **GOST** (`gost` / networking)
  - use_when: 要多协议代理/隧道组合
  - avoid_when: 只要单一成熟商业 VPN
  - repo: https://github.com/go-gost/gost
- **frp** (`frp` / networking)
  - use_when: 要把内网服务安全暴露出去
  - avoid_when: 已有公网入口与正规反向代理链路
  - repo: https://github.com/fatedier/frp
- **cloudflared** (`cloudflared` / networking)
  - use_when: 要用 Cloudflare Tunnel 暴露源站
  - avoid_when: 完全不想依赖 Cloudflare 控制面
  - repo: https://github.com/cloudflare/cloudflared
- result: PASS (hit=True, compliant=True)

### q46 — 移动端 UI 自动化测试不要太重
- **Maestro** (`maestro` / mobile)
  - use_when: 要用 YAML 风格快速写移动端 UI 测试
  - avoid_when: 要深度接入原生 XCTest/Espresso 体系
  - repo: https://github.com/mobile-dev-inc/maestro
- **Detox** (`detox` / mobile)
  - use_when: RN 应用要端到端测试
  - avoid_when: 非 RN 项目
  - repo: https://github.com/wix/Detox
- **Appium** (`appium` / mobile)
  - use_when: 原生/混合 App 要跨端自动化
  - avoid_when: 只要单元测试
  - repo: https://github.com/appium/appium
- result: PASS (hit=True, compliant=True)

### q47 — Flutter 应用代码热更新
- **Shorebird** (`shorebird` / mobile)
  - use_when: Flutter 应用要绕过商店发补丁级更新
  - avoid_when: 非 Flutter 或不允许热更新策略
  - repo: https://github.com/shorebirdtech/shorebird
- **Flutter Desktop** (`flutter-desktop` / desktop)
  - use_when: 已有 Flutter 移动应用要扩展到桌面
  - avoid_when: 只要轻量系统 WebView 壳且无 Dart 栈
  - repo: https://github.com/flutter/flutter
- **Flutter** (`flutter` / mobile)
  - use_when: 要 Android/iOS/桌面共用 UI 代码
  - avoid_when: 只要原生平台极致体验与最小包体
  - repo: https://github.com/flutter/flutter
- result: PASS (hit=True, compliant=True)

### q48 — Kotlin 多平台共享业务逻辑
- **Kotlin Multiplatform** (`kmp` / mobile)
  - use_when: 要在 Android/iOS 共享 Kotlin 业务层
  - avoid_when: 要完整跨端 UI 一体化（更看 Compose MP/Flutter）
  - repo: https://github.com/JetBrains/kotlin
- **Ktor** (`ktor` / mobile)
  - use_when: Kotlin 多平台/Android 网络与轻服务
  - avoid_when: 只要 Java OkHttp 生态
  - repo: https://github.com/ktorio/ktor
- **Android Kotlin guides repo** (`kotlin-android` / mobile)
  - use_when: 做原生 Android（Kotlin）
  - avoid_when: 只要跨平台框架
  - repo: https://github.com/android/kotlin-guides
- result: PASS (hit=True, compliant=True)

### q49 — 开源分布式链路追踪
- **Zipkin** (`zipkin` / observability)
  - use_when: 要轻量经典 tracing 后端
  - avoid_when: 要与 OTel 深度一体的现代栈
  - repo: https://github.com/openzipkin/zipkin
- **Grafana Tempo** (`tempo` / observability)
  - use_when: Grafana 生态要成本可控的 trace 存储
  - avoid_when: 非 Grafana 栈且只要一体式 APM
  - repo: https://github.com/grafana/tempo
- **Jaeger** (`jaeger` / observability)
  - use_when: 要开源链路追踪后端与 UI
  - avoid_when: 只要指标仪表盘不要链路
  - repo: https://github.com/jaegertracing/jaeger
- result: PASS (hit=True, compliant=True)

### q50 — 与 Grafana 配套的日志聚合
- **Grafana Loki** (`loki` / observability)
  - use_when: 要与 Prometheus/Grafana 同风格的日志栈
  - avoid_when: 要全文检索型日志平台（ELK）
  - repo: https://github.com/grafana/loki
- **OpenSearch** (`opensearch` / observability)
  - use_when: 要开源许可清晰的 ES 兼容搜索分析
  - avoid_when: 已深度绑定 Elastic 官方许可产品
  - repo: https://github.com/opensearch-project/opensearch
- **Graylog** (`graylog` / observability)
  - use_when: 要带告警/仪表盘的集中日志平台
  - avoid_when: 只要轻量 Loki 或纯搜索引擎
  - repo: https://github.com/Graylog2/graylog2-server
- result: PASS (hit=True, compliant=True)

### q51 — 应用错误监控与聚合
- **Sentry** (`sentry` / observability)
  - use_when: 要错误聚合、发行版追踪与前端/后端 APM
  - avoid_when: 只要基础设施指标不要应用错误
  - repo: https://github.com/getsentry/sentry
- **SigNoz** (`signoz` / observability)
  - use_when: 要一体式开源 APM 替代商业方案
  - avoid_when: 已有拆开的 Prometheus+Jaeger+Grafana 且满意
  - repo: https://github.com/SigNoz/signoz
- **Zipkin** (`zipkin` / observability)
  - use_when: 要轻量经典 tracing 后端
  - avoid_when: 要与 OTel 深度一体的现代栈
  - repo: https://github.com/openzipkin/zipkin
- result: PASS (hit=True, compliant=True)

### q52 — 自托管智能家居家庭自动化中枢
- **openHAB** (`openhab` / iot)
  - use_when: 要规则引擎强的家庭自动化替代
  - avoid_when: 更熟 Home Assistant 生态
  - repo: https://github.com/openhab/openhab-core
- **Home Assistant** (`home-assistant` / iot)
  - use_when: 要自托管智能家居中枢与海量集成
  - avoid_when: 只要单设备脚本无家庭场景
  - repo: https://github.com/home-assistant/core
- **Node-RED** (`nodered` / iot)
  - use_when: 要用可视化流连接设备与服务
  - avoid_when: 要强类型大型后端系统
  - repo: https://github.com/node-red/node-red
- result: PASS (hit=True, compliant=True)

### q53 — YAML 配置刷 ESP 传感器固件
- **ESPHome** (`esphome` / iot)
  - use_when: 要用声明式配置刷 ESP 传感器/开关
  - avoid_when: 要完全手写底层 IDF 驱动
  - repo: https://github.com/esphome/esphome
- **Tasmota** (`tasmota` / iot)
  - use_when: 要刷开源固件接管消费级 Wi-Fi 设备
  - avoid_when: 设备不支持或要官方保修
  - repo: https://github.com/arendst/Tasmota
- **ESP-IDF** (`esp-idf` / iot)
  - use_when: 要官方级 ESP32 深度开发
  - avoid_when: 只要快速 YAML 刷机（ESPHome）
  - repo: https://github.com/espressif/esp-idf
- result: PASS (hit=True, compliant=True)

### q54 — 轻量自托管 MQTT broker
- **EMQX** (`emqx` / iot)
  - use_when: 要高并发 MQTT 与规则引擎
  - avoid_when: 家庭实验室只要 Mosquitto
  - repo: https://github.com/emqx/emqx
- **Eclipse Mosquitto** (`mosquitto` / iot)
  - use_when: 要自托管 MQTT 消息总线
  - avoid_when: 只要云厂商托管 MQTT
  - repo: https://github.com/eclipse/mosquitto
- **Zigbee2MQTT** (`zigbee2mqtt` / iot)
  - use_when: 要用 MQTT 统一接入 Zigbee 设备
  - avoid_when: 全屋已是 Z-Wave/Matter 且无 Zigbee
  - repo: https://github.com/Koenkk/zigbee2mqtt
- result: PASS (hit=True, compliant=True)

### q55 — 命令行音视频转码处理
- **HandBrake** (`handbrake` / media)
  - use_when: 要批量视频压片且偏好图形界面
  - avoid_when: 要完全脚本化复杂滤镜图
  - repo: https://github.com/HandBrake/HandBrake
- **GStreamer** (`gstreamer` / media)
  - use_when: 要可编程音视频管道嵌入应用
  - avoid_when: 只要一次性 ffmpeg 命令
  - repo: https://github.com/GStreamer/gstreamer
- **FFmpeg** (`ffmpeg` / media)
  - use_when: 要转码、剪辑管道或流媒体处理
  - avoid_when: 只要图形化剪辑时间线给普通人
  - repo: https://github.com/FFmpeg/FFmpeg
- result: PASS (hit=True, compliant=True)

### q56 — 开源直播推流和录屏
- **OBS Studio** (`obs-studio` / media)
  - use_when: 要直播推流、录屏与场景切换
  - avoid_when: 只要命令行一次性转码
  - repo: https://github.com/obsproject/obs-studio
- **yt-dlp** (`yt-dlp` / media)
  - use_when: 要从网站下载音视频并后处理
  - avoid_when: 要合法仅限官方客户端的内容分发
  - repo: https://github.com/yt-dlp/yt-dlp
- **whisper.cpp** (`whisper-cpp` / media)
  - use_when: 要本地离线语音转文字
  - avoid_when: 只要云端 ASR API
  - repo: https://github.com/ggerganov/whisper.cpp
- result: PASS (hit=True, compliant=True)

### q57 — 自托管影视媒体服务器
- **Navidrome** (`navidrome` / media)
  - use_when: 要自托管音乐库流媒体
  - avoid_when: 要完整影视剧媒体中心
  - repo: https://github.com/navidrome/navidrome
- **Jellyfin** (`jellyfin` / media)
  - use_when: 要自托管影视/音乐库与多端播放
  - avoid_when: 只要单机播放文件
  - repo: https://github.com/jellyfin/jellyfin
- **yt-dlp** (`yt-dlp` / media)
  - use_when: 要从网站下载音视频并后处理
  - avoid_when: 要合法仅限官方客户端的内容分发
  - repo: https://github.com/yt-dlp/yt-dlp
- result: PASS (hit=True, compliant=True)

### q58 — 开源游戏引擎做 2D 和 3D
- **Godot Engine** (`godot` / gamedev)
  - use_when: 要开源、轻量、一体化的 2D/3D 引擎
  - avoid_when: 团队已深度绑定商业引擎管线
  - repo: https://github.com/godotengine/godot
- **MonoGame** (`monogame` / gamedev)
  - use_when: .NET 团队要跨平台 2D/3D 框架
  - avoid_when: 非 C# 栈
  - repo: https://github.com/MonoGame/MonoGame
- **Bevy** (`bevy` / gamedev)
  - use_when: 要用 Rust ECS 做游戏/交互应用
  - avoid_when: 要开箱即用的可视化编辑器为主
  - repo: https://github.com/bevyengine/bevy
- result: PASS (hit=True, compliant=True)

### q59 — 浏览器 HTML5 2D 游戏框架
- **Phaser** (`phaser` / gamedev)
  - use_when: 要浏览器 2D 游戏
  - avoid_when: 要原生高性能 3D
  - repo: https://github.com/phaserjs/phaser
- **three.js** (`threejs` / gamedev)
  - use_when: 浏览器里做 3D 可视化/轻游戏
  - avoid_when: 要 AAA 原生引擎
  - repo: https://github.com/mrdoob/three.js
- **Babylon.js** (`babylonjs` / gamedev)
  - use_when: 要更完整的 Web 3D 引擎能力
  - avoid_when: 只要最小 WebGL 渲染器
  - repo: https://github.com/BabylonJS/Babylon.js
- result: PASS (hit=True, compliant=True)

### q60 — 浏览器 Web 3D 渲染库
- **three.js** (`threejs` / gamedev)
  - use_when: 浏览器里做 3D 可视化/轻游戏
  - avoid_when: 要 AAA 原生引擎
  - repo: https://github.com/mrdoob/three.js
- **Babylon.js** (`babylonjs` / gamedev)
  - use_when: 要更完整的 Web 3D 引擎能力
  - avoid_when: 只要最小 WebGL 渲染器
  - repo: https://github.com/BabylonJS/Babylon.js
- **Bullet Physics** (`bullet3` / gamedev)
  - use_when: 3D 游戏/仿真需要物理
  - avoid_when: 只要 2D 物理
  - repo: https://github.com/bulletphysics/bullet3
- result: PASS (hit=True, compliant=True)

### q61 — 开源桌面 GIS 制图软件
- **QGIS** (`qgis` / gis)
  - use_when: 要桌面端制图、分析与数据管理
  - avoid_when: 只要嵌入网页的轻量地图组件
  - repo: https://github.com/qgis/QGIS
- **GRASS GIS** (`grass-gis` / gis)
  - use_when: 要科学级栅格/矢量地理处理
  - avoid_when: 只要轻量制图 UI
  - repo: https://github.com/OSGeo/grass
- **OpenLayers** (`openlayers` / gis)
  - use_when: Web 端要更强 GIS 能力与多源数据
  - avoid_when: 只要最简标记点地图
  - repo: https://github.com/openlayers/openlayers
- result: PASS (hit=True, compliant=True)

### q62 — 网页嵌入轻量交互地图
- **Leaflet** (`leaflet` / gis)
  - use_when: 网页嵌入轻量交互地图
  - avoid_when: 要复杂 3D/海量矢量瓦片引擎
  - repo: https://github.com/Leaflet/Leaflet
- **OpenLayers** (`openlayers` / gis)
  - use_when: Web 端要更强 GIS 能力与多源数据
  - avoid_when: 只要最简标记点地图
  - repo: https://github.com/openlayers/openlayers
- **MapLibre GL** (`maplibre-gl` / gis)
  - use_when: 要开源矢量瓦片漂亮底图渲染
  - avoid_when: 绑定专有 Mapbox 条款可接受且需要其云
  - repo: https://github.com/maplibre/maplibre-gl-js
- result: PASS (hit=True, compliant=True)

### q63 — PostgreSQL 空间数据库扩展
- **PostGIS** (`postgis` / gis)
  - use_when: 要在 Postgres 里做空间查询与索引
  - avoid_when: 只要文件级 GIS 无数据库
  - repo: https://github.com/postgis/postgis
- **Turf.js** (`turfjs` / gis)
  - use_when: 前端做缓冲/布尔/测距等空间运算
  - avoid_when: 要数据库级海量空间 SQL
  - repo: https://github.com/Turfjs/turf
- **tippecanoe** (`tippecanoe` / gis)
  - use_when: 要把矢量数据打成 MBTiles/矢量瓦片
  - avoid_when: 只要即时动态查询无预切片
  - repo: https://github.com/felt/tippecanoe
- result: PASS (hit=True, compliant=True)

### q64 — 开源加密货币交易机器人
- **Freqtrade** (`freqtrade` / finance)
  - use_when: 要策略化加密货币自动交易
  - avoid_when: 要股票/期货为主且无加密需求
  - repo: https://github.com/freqtrade/freqtrade
- **CCXT** (`ccxt` / finance)
  - use_when: 要对接多家交易所行情与下单 API
  - avoid_when: 只要传统股票券商接口
  - repo: https://github.com/ccxt/ccxt
- **Hummingbot** (`hummingbot` / finance)
  - use_when: 要自建加密货币做市或策略机器人并可对接多交易所
  - avoid_when: 要传统股票回测框架或个人记账
  - repo: https://github.com/hummingbot/hummingbot
- result: PASS (hit=True, compliant=True)

### q65 — Python 量化策略回测框架
- **backtrader** (`backtrader` / finance)
  - use_when: 要灵活的 Python 策略回测框架
  - avoid_when: 要超大规模机构级回测平台
  - repo: https://github.com/mementum/backtrader
- **Zipline-Reloaded** (`zipline-reloaded` / finance)
  - use_when: 要事件驱动的股票策略回测
  - avoid_when: 只要简单向量化回测脚本
  - repo: https://github.com/stefan-jansen/zipline-reloaded
- **vectorbt** (`vectorbt` / finance)
  - use_when: 要快速参数扫描与向量化回测
  - avoid_when: 要精细订单簿级仿真
  - repo: https://github.com/polakowo/vectorbt
- result: PASS (hit=True, compliant=True)

### q66 — 自托管个人记账和预算
- **Ghostfolio** (`ghostfolio` / finance)
  - use_when: 要自托管跟踪多资产投资组合与净值
  - avoid_when: 只要日常流水记账（Firefly/Actual）或交易策略回测
  - repo: https://github.com/ghostfolio/ghostfolio
- **Firefly III** (`firefly-iii` / finance)
  - use_when: 要自托管记账与预算
  - avoid_when: 只要交易策略回测
  - repo: https://github.com/firefly-iii/firefly-iii
- **Actual Budget** (`actual-budget` / finance)
  - use_when: 要本地/可同步的预算记账
  - avoid_when: 要企业总账
  - repo: https://github.com/actualbudget/actual
- result: PASS (hit=True, compliant=True)

### q67 — Solidity 合约需要高速本地测试和脚本化部署
- **Foundry** (`foundry` / blockchain)
  - use_when: 要高速本地测试与脚本化合约开发
  - avoid_when: 团队已深度绑定 Hardhat JS 生态且无迁移窗口
  - repo: https://github.com/foundry-rs/foundry
- **Hardhat** (`hardhat` / blockchain)
  - use_when: 要用 JS/TS 插件生态做合约开发测试
  - avoid_when: 只要纯 Rust/Foundry 工作流
  - repo: https://github.com/NomicFoundation/hardhat
- **Solidity** (`solidity` / blockchain)
  - use_when: 写 EVM 智能合约
  - avoid_when: 非 EVM 目标链
  - repo: https://github.com/ethereum/solidity
- result: PASS (hit=True, compliant=True)

