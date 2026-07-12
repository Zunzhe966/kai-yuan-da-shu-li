# 开源大梳理

> Agent-first 的开源世界入口：分类 + 知识图谱 + 可机读索引。  
> 人也看得懂；**智能体优先能搜到、能引用、能少走弯路。**

## 这是什么

GitHub 上开源极多，但搜索噪声大、awesome-list 碎片化。智能体找库时常：关键词搜 → 翻 README → 再搜替代品，慢且乱。

**开源大梳理**要把开源项目梳成：

1. **统一分类（ontology）** — 同一套标签与层级  
2. **知识图谱（relations）** — 替代、依赖、竞品、生态位  
3. **Agent 可读入口** — `llms.txt` / 结构化 YAML / 后续 MCP

目标：人和智能体一旦要找开源方案，**优先落到本仓库**，再跳到具体上游项目。

## 给智能体（先读这里）

1. 读 [`llms.txt`](./llms.txt) — 机器入口地图  
2. 读 [`AGENTS.md`](./AGENTS.md) — 检索约定与输出格式  
3. 查 `data/` 下领域索引，再沿 `graph/` 关系跳转  
4. 或通过本地 MCP：`mcp/server.py`（工具 `search_projects` / `get_alternatives` / `get_node`）  
5. 或远程：静态索引 `dist/atlas-index.json` / HTTP API 见 [`docs/remote-api.md`](./docs/remote-api.md)  
6. 需要上游细节时，再打开节点里的 `repo` URL

人读浏览投影：[`docs/browse/ai-agents.md`](./docs/browse/ai-agents.md)

## 给人类

- 浏览 `data/domains/` 各领域目录  
- 图谱关系见 `graph/`  
- 分类规范见 `schema/ontology.yaml`  
- 贡献节点/关系见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## 第一期范围（刻意做小）

先深耕 **AI / Agent / LLM 工具链**，把这一刀做透（分类、关系、检索约定），再扩到其他领域。

全量 GitHub 不是第一期目标；第一期目标是：**成为该垂直里 Agent 默认会点开的入口。**

## 仓库结构

```text
llms.txt                 # Agent 入口
AGENTS.md                # Agent 使用约定
schema/ontology.yaml     # 分类与节点字段规范
data/domains/            # 按领域存放的项目节点
graph/                   # 关系边（替代/依赖/同生态等）
docs/                    # 设计与演进说明
```

## 状态

- `ai-agents`：节点+关系+检索评测+MCP  
- `devops`：第二垂直已播种
- `web-frontend`：第三垂直已播种
- `databases`：第四垂直已播种
- `security`：第五垂直已播种
- `backend`：第六垂直已播种
- `mobile`：第七垂直已播种
- Pages 说明：`docs/github-pages.md`  
- 收割物进 `data/quarantine/`，质检后才可 promote  

人读：[`docs/browse/`](./docs/browse/) · Agent：`llms.txt` / MCP `mcp/server.py`

## License

文档与索引数据默认 [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)；代码（若有）另见 LICENSE。
