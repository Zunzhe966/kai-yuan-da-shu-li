# 如何给开源大梳理贡献节点

本仓库是 **索引与知识图谱**，不是代码托管。贡献前请先读：

1. `schema/ontology.yaml` — 字段与关系类型  
2. `AGENTS.md` — Agent 检索协议（回答也按此格式）

## 加一个项目节点

1. 新建 `data/domains/<domain>/nodes/<id>.yaml`  
   - 第一期 domain 只有：`ai-agents`  
   - `id` 用小写短横线，与文件名一致
2. **必填字段**：`id`, `name`, `repo`, `summary`, `tags`, `status`  
3. **强烈建议**：`use_when`, `avoid_when`, `niche`, `language`  
4. 把 `id` 挂进 `data/domains/<domain>/_index.yaml` 对应分类的 `node_ids`

### 节点最小示例

```yaml
id: example-tool
type: project
name: Example Tool
repo: https://github.com/org/example-tool
summary: 一句话说明它解决什么问题。
tags: [agent-framework]
language: Python
status: active
use_when: 什么场景优先选它
avoid_when: 什么场景别选它
niche: 它的生态位
```

## 加一条关系

在 `graph/edges.yaml` 追加：

```yaml
  - from: a-id
    type: alternative_to   # 或 depends_on / integrates_with / supersedes / same_ecosystem
    to: b-id
    note: 一句说明为何有这条边
```

`from` / `to` 必须已有对应节点文件。

## 禁止

- 只丢 star 很高的链接、不写 `use_when` / `avoid_when`
- 无质检批量灌入 awesome-list
- 把无关领域硬塞进 `ai-agents`（新领域另开 `data/domains/<新domain>/`）

## 本地自检（合并前）

```bash
# 节点文件存在
ls data/domains/ai-agents/nodes/*.yaml | wc -l

# index 里的 id 都应有文件（缺文件即失败）
# 关系两端 id 都应有文件
```

更完整的校验脚本将在 D2（`scripts/validate_graph.py`）补齐。
