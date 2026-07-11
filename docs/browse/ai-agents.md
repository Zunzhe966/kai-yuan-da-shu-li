# 开源大梳理 · ai-agents 浏览索引

> YAML 投影；权威数据在 data/ graph/

## Agent / LLM 应用框架

- [AutoGen](https://github.com/microsoft/autogen) — 微软系多 Agent 对话与协作框架。
- [LlamaIndex](https://github.com/run-llama/llama_index) — 偏 RAG / 数据接入的 LLM 框架，文档与索引工作流强。
- [LangChain](https://github.com/langchain-ai/langchain) — 通用 LLM 应用编排框架，生态大、集成多，适合快速拼装链路。
- [LangGraph](https://github.com/langchain-ai/langgraph) — LangChain 生态的图/状态机式 Agent 编排，适合可控多步工作流。
- [CrewAI](https://github.com/crewAIInc/crewAI) — 角色化多 Agent「船员」协作框架，强调任务分工。
- [Semantic Kernel](https://github.com/microsoft/semantic-kernel) — 微软 LLM 编排 SDK，插件/规划器模型，多语言。
- [DSPy](https://github.com/stanfordnlp/dspy) — 斯坦福声明式提示与程序优化框架，把 prompt 当可优化参数。
- [Pydantic AI](https://github.com/pydantic/pydantic-ai) — Pydantic 团队的类型友好 Agent 框架，结构化输出强。
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) — OpenAI 官方轻量多 Agent/工具编排 SDK。
- [Vercel AI SDK](https://github.com/vercel/ai) — 面向 Web/TS 的流式 AI SDK，UI 与模型调用一体。
- [LiteLLM](https://github.com/BerriAI/litellm) — 统一多厂商 LLM API 的代理/SDK，OpenAI 兼容接口。
- [Mem0](https://github.com/mem0ai/mem0) — Agent 长期记忆层，跨会话偏好与事实存储。
- [Browser Use](https://github.com/browser-use/browser-use) — 让 Agent 操作真实浏览器的自动化框架。
- [Aider](https://github.com/Aider-AI/aider) — 终端里的 AI 结对编程，直接改 git 仓库。
- [GPT Researcher](https://github.com/assafelovic/gpt-researcher) — 面向深度调研的 Agent，自动搜网写报告。

## 多 Agent 协作

- [AutoGen](https://github.com/microsoft/autogen) — 微软系多 Agent 对话与协作框架。
- [CrewAI](https://github.com/crewAIInc/crewAI) — 角色化多 Agent「船员」协作框架，强调任务分工。
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) — OpenAI 官方轻量多 Agent/工具编排 SDK。
- [GPT Researcher](https://github.com/assafelovic/gpt-researcher) — 面向深度调研的 Agent，自动搜网写报告。
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT) — 多角色软件公司模拟的多 Agent 框架。

## RAG / 数据框架

- [LlamaIndex](https://github.com/run-llama/llama_index) — 偏 RAG / 数据接入的 LLM 框架，文档与索引工作流强。
- [Haystack](https://github.com/deepset-ai/haystack) — deepset 的 NLP/RAG 流水线框架，管道组合清晰。
- [Mem0](https://github.com/mem0ai/mem0) — Agent 长期记忆层，跨会话偏好与事实存储。

## 向量库 / 检索后端

- [Chroma](https://github.com/chroma-core/chroma) — 开发者友好的嵌入数据库，RAG 入门常见。
- [Qdrant](https://github.com/qdrant/qdrant) — Rust 向量数据库，过滤与生产部署友好。
- [Milvus](https://github.com/milvus-io/milvus) — 云原生大规模向量数据库。
- [Faiss](https://github.com/facebookresearch/faiss) — Meta 的相似向量检索库，算法层基础件。
- [LanceDB](https://github.com/lancedb/lancedb) — 基于 Lance 格式的嵌入式向量库，分析友好。

## MCP / 工具协议

- [开源大梳理](https://github.com/Zunzhe966/kaiyuan-dashuli) — Agent-first 开源知识图谱入口（本仓库）；分类、关系与可机读检索，减少盲搜 GitHub。
- [Model Context Protocol Servers](https://github.com/modelcontextprotocol/servers) — 官方/参考 MCP server 集合，给 Agent 接工具与数据源。
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — Model Context Protocol 官方 Python SDK。

## 本地 / 推理运行时

- [Ollama](https://github.com/ollama/ollama) — 本地一键跑开源大模型的运行时与模型分发。
- [vLLM](https://github.com/vllm-project/vllm) — 高吞吐 LLM 推理引擎，PagedAttention，适合自托管服务。
- [llama.cpp](https://github.com/ggml-org/llama.cpp) — C/C++ 本地 LLM 推理，GGUF 生态核心。
- [SGLang](https://github.com/sgl-project/sglang) — 结构化生成与高吞吐推理运行时。
- [Outlines](https://github.com/dottxt-ai/outlines) — 结构化生成库，约束解码友好。
- [Open WebUI](https://github.com/open-webui/open-webui) — 自托管的 ChatGPT 风格 Web UI，常配 Ollama。
- [Hugging Face Transformers](https://github.com/huggingface/transformers) — 预训练模型加载与推理的事实标准库。

## 评测与质量

- [Ragas](https://github.com/explodinggradients/ragas) — RAG 流水线评测框架。
- [DeepEval](https://github.com/confident-ai/deepeval) — LLM 应用单元测试/评测框架，像 pytest 一样写用例。
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) — 开源 AI 可观测与评估，偏 tracing/评估工作台。

## 观测与追踪

- [Langfuse](https://github.com/langfuse/langfuse) — 开源 LLM 可观测：追踪、提示管理、评分。
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) — 开源 AI 可观测与评估，偏 tracing/评估工作台。

## 提示词与护栏

- [DSPy](https://github.com/stanfordnlp/dspy) — 斯坦福声明式提示与程序优化框架，把 prompt 当可优化参数。
- [Langfuse](https://github.com/langfuse/langfuse) — 开源 LLM 可观测：追踪、提示管理、评分。
- [Guardrails AI](https://github.com/guardrails-ai/guardrails) — LLM 输出校验与护栏框架。
- [Instructor](https://github.com/instructor-ai/instructor) — 用 Pydantic 约束 LLM 结构化输出的薄库。
- [Outlines](https://github.com/dottxt-ai/outlines) — 结构化生成库，约束解码友好。

## 微调 / 训练辅助

- [Hugging Face Transformers](https://github.com/huggingface/transformers) — 预训练模型加载与推理的事实标准库。
- [PEFT](https://github.com/huggingface/peft) — Hugging Face 参数高效微调库（LoRA 等）。
- [Axolotl](https://github.com/axolotl-ai-cloud/axolotl) — 大模型微调工具包，配置化训练常见。

## 数据集

- [Hugging Face Datasets](https://github.com/huggingface/datasets) — 大规模数据集加载与处理库。

## Agent / Chat UI

- [Vercel AI SDK](https://github.com/vercel/ai) — 面向 Web/TS 的流式 AI SDK，UI 与模型调用一体。
- [Open WebUI](https://github.com/open-webui/open-webui) — 自托管的 ChatGPT 风格 Web UI，常配 Ollama。
- [Continue](https://github.com/continuedev/continue) — 开源 IDE 编码助手扩展，可接多模型。
