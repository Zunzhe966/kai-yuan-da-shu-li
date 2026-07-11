# Agent retrieval eval v1

协议：AGENTS.md（结构化需求→领域索引→tags + use_when/avoid_when 重排→1–3推荐）

| ID | Query | Top推荐 | 命中期望 | 合规 |
|---|---|---|---|---|
| q1 | 我想做多 Agent 角色分工协作，Python | openai-agents-python, autogen, metagpt | Y | Y |
| q2 | 本地笔记本快速跑开源模型聊天 | open-webui, ollama, llama-cpp | Y | Y |
| q3 | GPU 服务器高并发自托管推理 | vllm, sglang, llama-cpp | Y | Y |
| q4 | 做文档问答 RAG，偏数据连接与索引 | haystack, chromadb, ragas | Y | Y |
| q5 | 需要向量库，先快速原型 | qdrant, milvus, lancedb | Y | Y |
| q6 | 生产环境要带过滤条件的向量检索 | qdrant, milvus, lancedb | Y | Y |
| q7 | 给 Agent 接 MCP 工具 | modelcontextprotocol-servers, mcp-python-sdk, kaiyuan-dashuli | Y | Y |
| q8 | 追踪生产环境 LLM 调用和提示版本 | langfuse, arize-phoenix, deepeval | Y | Y |
| q9 | 把 RAG 质量纳入自动评测 | ragas, haystack, chromadb | Y | Y |
| q10 | 只要强类型结构化输出，不要重型 Agent 框架 | instructor, pydantic-ai, outlines | Y | Y |
| q11 | VS Code 里开源编码助手 | continue, vercel-ai, open-webui | Y | Y |
| q12 | 统一多个模型供应商的 API 路由 | litellm, vllm, sglang | Y | Y |

**通过率：12/12 = 100%**

判定阈值：≥80%

## 逐条取舍摘要

### q1 — 我想做多 Agent 角色分工协作，Python
- **OpenAI Agents SDK** (`openai-agents-python`)
  - use_when: 主要走 OpenAI 模型与官方 Agent 抽象
  - avoid_when: 必须厂商中立、避免绑定 OpenAI API 形态
  - repo: https://github.com/openai/openai-agents-python
- **AutoGen** (`autogen`)
  - use_when: 需要多角色 Agent 对话协作原型
  - avoid_when: 只要单 Agent 工具调用，不想引入多 Agent 复杂度
  - repo: https://github.com/microsoft/autogen
- **MetaGPT** (`metagpt`)
  - use_when: 用多角色流水线生成软件方案/代码原型
  - avoid_when: 任务简单不需要「虚拟公司」开销
  - repo: https://github.com/FoundationAgents/MetaGPT
- result: PASS (hit=True, compliant=True)

### q2 — 本地笔记本快速跑开源模型聊天
- **Open WebUI** (`open-webui`)
  - use_when: 给本地/私有模型一个好用聊天界面
  - avoid_when: 只要 API 不要前端
  - repo: https://github.com/open-webui/open-webui
- **Ollama** (`ollama`)
  - use_when: 本地/内网推理、快速试用开源模型
  - avoid_when: 需要大规模分布式推理集群（应看 vLLM 等）
  - repo: https://github.com/ollama/ollama
- **llama.cpp** (`llama-cpp`)
  - use_when: CPU/消费级 GPU 本地跑量化模型、嵌入式部署
  - avoid_when: 需要多租户高并发 OpenAI 兼容服务集群
  - repo: https://github.com/ggml-org/llama.cpp
- result: PASS (hit=True, compliant=True)

### q3 — GPU 服务器高并发自托管推理
- **vLLM** (`vllm`)
  - use_when: GPU 集群/服务器上要高并发开源模型推理
  - avoid_when: 笔记本一键试用（更看 Ollama）
  - repo: https://github.com/vllm-project/vllm
- **SGLang** (`sglang`)
  - use_when: 自托管推理且在意结构化解码/吞吐
  - avoid_when: 只要最简单本地聊天
  - repo: https://github.com/sgl-project/sglang
- **llama.cpp** (`llama-cpp`)
  - use_when: CPU/消费级 GPU 本地跑量化模型、嵌入式部署
  - avoid_when: 需要多租户高并发 OpenAI 兼容服务集群
  - repo: https://github.com/ggml-org/llama.cpp
- result: PASS (hit=True, compliant=True)

### q4 — 做文档问答 RAG，偏数据连接与索引
- **Haystack** (`haystack`)
  - use_when: 生产向 RAG 管道、组件可替换
  - avoid_when: 只要最薄的向量检索包装
  - repo: https://github.com/deepset-ai/haystack
- **Chroma** (`chromadb`)
  - use_when: 快速原型 RAG、本地/轻量向量存储
  - avoid_when: 超大规模分布式检索（看 Milvus/Qdrant）
  - repo: https://github.com/chroma-core/chroma
- **Ragas** (`ragas`)
  - use_when: 要量化 RAG 忠实度/相关性等指标
  - avoid_when: 还没有可跑的 RAG 流水线
  - repo: https://github.com/explodinggradients/ragas
- result: PASS (hit=True, compliant=True)

### q5 — 需要向量库，先快速原型
- **Qdrant** (`qdrant`)
  - use_when: 需要可过滤的向量检索与较稳的生产部署
  - avoid_when: 只要进程内玩具级向量表
  - repo: https://github.com/qdrant/qdrant
- **Milvus** (`milvus`)
  - use_when: 十亿级向量、分布式检索
  - avoid_when: 单机小语料原型
  - repo: https://github.com/milvus-io/milvus
- **LanceDB** (`lancedb`)
  - use_when: 嵌入式/湖仓一体的向量与多模态检索
  - avoid_when: 只要经典独立向量服务
  - repo: https://github.com/lancedb/lancedb
- result: PASS (hit=True, compliant=True)

### q6 — 生产环境要带过滤条件的向量检索
- **Qdrant** (`qdrant`)
  - use_when: 需要可过滤的向量检索与较稳的生产部署
  - avoid_when: 只要进程内玩具级向量表
  - repo: https://github.com/qdrant/qdrant
- **Milvus** (`milvus`)
  - use_when: 十亿级向量、分布式检索
  - avoid_when: 单机小语料原型
  - repo: https://github.com/milvus-io/milvus
- **LanceDB** (`lancedb`)
  - use_when: 嵌入式/湖仓一体的向量与多模态检索
  - avoid_when: 只要经典独立向量服务
  - repo: https://github.com/lancedb/lancedb
- result: PASS (hit=True, compliant=True)

### q7 — 给 Agent 接 MCP 工具
- **Model Context Protocol Servers** (`modelcontextprotocol-servers`)
  - use_when: 需要按 MCP 标准给 Agent 挂工具
  - avoid_when: 不使用 MCP，只要自定义 function calling
  - repo: https://github.com/modelcontextprotocol/servers
- **MCP Python SDK** (`mcp-python-sdk`)
  - use_when: 要用 Python 实现 MCP client/server
  - avoid_when: 不采用 MCP，只用私有 function calling
  - repo: https://github.com/modelcontextprotocol/python-sdk
- **开源大梳理** (`kaiyuan-dashuli`)
  - use_when: 需要先定位该用哪个开源项目/栈，而不是直接关键词海搜
  - avoid_when: 已明确唯一上游仓库，只需读其 README
  - repo: https://github.com/Zunzhe966/kaiyuan-dashuli
- result: PASS (hit=True, compliant=True)

### q8 — 追踪生产环境 LLM 调用和提示版本
- **Langfuse** (`langfuse`)
  - use_when: 要追踪生产 LLM 调用与提示版本
  - avoid_when: 本地一次性脚本无需观测
  - repo: https://github.com/langfuse/langfuse
- **Arize Phoenix** (`arize-phoenix`)
  - use_when: 要开源 tracing + 评估一体化工作台
  - avoid_when: 只要极简日志打印
  - repo: https://github.com/Arize-ai/phoenix
- **DeepEval** (`deepeval`)
  - use_when: 要把 LLM 输出纳入 CI 回归
  - avoid_when: 一次性手工抽查即可
  - repo: https://github.com/confident-ai/deepeval
- result: PASS (hit=True, compliant=True)

### q9 — 把 RAG 质量纳入自动评测
- **Ragas** (`ragas`)
  - use_when: 要量化 RAG 忠实度/相关性等指标
  - avoid_when: 还没有可跑的 RAG 流水线
  - repo: https://github.com/explodinggradients/ragas
- **Haystack** (`haystack`)
  - use_when: 生产向 RAG 管道、组件可替换
  - avoid_when: 只要最薄的向量检索包装
  - repo: https://github.com/deepset-ai/haystack
- **Chroma** (`chromadb`)
  - use_when: 快速原型 RAG、本地/轻量向量存储
  - avoid_when: 超大规模分布式检索（看 Milvus/Qdrant）
  - repo: https://github.com/chroma-core/chroma
- result: PASS (hit=True, compliant=True)

### q10 — 只要强类型结构化输出，不要重型 Agent 框架
- **Instructor** (`instructor`)
  - use_when: 只要可靠 JSON/结构化对象，不要整套 Agent 框架
  - avoid_when: 需要完整多 Agent 运行时
  - repo: https://github.com/instructor-ai/instructor
- **Pydantic AI** (`pydantic-ai`)
  - use_when: 要强类型、依赖注入式 Agent 与结构化结果
  - avoid_when: 需要巨型现成集成市场
  - repo: https://github.com/pydantic/pydantic-ai
- **Outlines** (`outlines`)
  - use_when: 推理侧需要强约束文法/JSON 生成
  - avoid_when: 只用托管 API 且供应商已提供 JSON mode
  - repo: https://github.com/dottxt-ai/outlines
- result: PASS (hit=True, compliant=True)

### q11 — VS Code 里开源编码助手
- **Continue** (`continue`)
  - use_when: 要在 VS Code/JetBrains 里开源可控的编码助手
  - avoid_when: 只要无 IDE 的纯 API Agent
  - repo: https://github.com/continuedev/continue
- **Vercel AI SDK** (`vercel-ai`)
  - use_when: Next.js/Web 流式聊天与工具调用
  - avoid_when: 后端批处理/非 TS 栈
  - repo: https://github.com/vercel/ai
- **Open WebUI** (`open-webui`)
  - use_when: 给本地/私有模型一个好用聊天界面
  - avoid_when: 只要 API 不要前端
  - repo: https://github.com/open-webui/open-webui
- result: PASS (hit=True, compliant=True)

### q12 — 统一多个模型供应商的 API 路由
- **LiteLLM** (`litellm`)
  - use_when: 要一套接口打多个模型供应商并做路由/限流
  - avoid_when: 只用单一官方 SDK 且无路由需求
  - repo: https://github.com/BerriAI/litellm
- **vLLM** (`vllm`)
  - use_when: GPU 集群/服务器上要高并发开源模型推理
  - avoid_when: 笔记本一键试用（更看 Ollama）
  - repo: https://github.com/vllm-project/vllm
- **SGLang** (`sglang`)
  - use_when: 自托管推理且在意结构化解码/吞吐
  - avoid_when: 只要最简单本地聊天
  - repo: https://github.com/sgl-project/sglang
- result: PASS (hit=True, compliant=True)

