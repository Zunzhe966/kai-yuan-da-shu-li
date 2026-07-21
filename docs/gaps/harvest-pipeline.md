# 收获管道：候选 → quarantine → 正式节点

与 `scripts/harvest_to_quarantine.py`、[`inclusion-criteria.md`](../inclusion-criteria.md) 对齐。

## 流程

1. **对照缺口表**（如 `docs/gaps/batch1-gap-table.md`）选出候选。  
2. **入 quarantine**（禁止直接手写半成品进正式 `nodes/` 冒充完成）：

```bash
cd 开源大梳理
printf 'localai|LocalAI|https://github.com/mudler/LocalAI|自托管 OpenAI 兼容引擎|local-llm,llm-api\n' > /tmp/seeds.txt
.venv/bin/python scripts/harvest_to_quarantine.py --domain ai-agents --from-file /tmp/seeds.txt
```

3. **补齐必填**：`use_when` / `avoid_when` / `license` / `status`；按需 `homepage`。  
4. **promote** 到 `data/domains/<domain>/nodes/`，更新 `_index.yaml`，写 `graph/edges.yaml`（或缺口说明）。  
5. **校验**：`.venv/bin/python scripts/validate_graph.py`  
6. **评测回归**（改检索面时）：`.venv/bin/python scripts/run_retrieval_eval.py`  
7. **PR → pages-deploy**。

## 本批说明

Batch 1 因字段已齐、可核验，部分节点经标准核对后**直接写入正式节点**（仍保留本管道供后续大批量候选）。后续默认走 quarantine，除非单条已完整达标。
