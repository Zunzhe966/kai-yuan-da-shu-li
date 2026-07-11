# Agent retrieval eval v1

nodes=96

| ID | Query | Domain | Top | Hit |
|---|---|---|---|---|
| q1 | 我想做多 Agent 角色分工协作，Python | ai-agents | openai-agents-python, autogen, metagpt | Y |
| q2 | 本地笔记本快速跑开源模型聊天 | ai-agents | ollama, open-webui, llama-cpp | Y |
| q3 | GPU 服务器高并发自托管推理 | ai-agents | vllm, sglang, llama-cpp | Y |
| q4 | 做文档问答 RAG，偏数据连接与索引 | ai-agents | haystack, crawl4ai, chromadb | Y |
| q5 | 需要向量库，先快速原型 | ai-agents | lancedb, chromadb, qdrant | Y |
| q6 | 生产环境要带过滤条件的向量检索 | ai-agents | weaviate, qdrant, milvus | Y |
| q7 | 给 Agent 接 MCP 工具 | ai-agents | modelcontextprotocol-servers, mcp-python-sdk, kaiyuan-dashuli | Y |
| q8 | 追踪生产环境 LLM 调用和提示版本 | ai-agents | langfuse, opentelemetry-python, arize-phoenix | Y |
| q9 | 把 RAG 质量纳入自动评测 | ai-agents | ragas, haystack, crawl4ai | Y |
| q10 | 只要强类型结构化输出，不要重型 Agent 框架 | ai-agents | instructor, pydantic-ai, outlines | Y |
| q11 | VS Code 里开源编码助手 | ai-agents | continue, vercel-ai, open-webui | Y |
| q12 | 统一多个模型供应商的 API 路由 | ai-agents | litellm, vllm, sglang | Y |
| q13 | Kubernetes 上做 GitOps 持续交付 | devops | flux2, argo-cd, kubernetes | Y |
| q14 | 不想上满血 K8s，只要轻量工作负载调度 | devops | nomad, istio, helm | Y |
| q15 | 基础设施即代码，团队更熟 Python/TS | devops | pulumi, terraform, vault | Y |
| q16 | React 项目要 SSR 和文件系统路由 | web-frontend | nextjs, remix, nuxt | Y |
| q17 | 前端要快速本地开发和现代打包 | web-frontend | vite, webpack | Y |
| q18 | 多浏览器端到端测试 | web-frontend | playwright, cypress, vitest | Y |

**通过率：18/18 = 100%**

