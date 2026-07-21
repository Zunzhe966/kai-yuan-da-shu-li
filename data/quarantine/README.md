# Quarantine（收割隔离区）

收割脚本写入这里的候选节点 **不是正式图谱**。

规则：

1. `scripts/harvest_to_quarantine.py --from-file ...` → 生成 `*.yaml`（`use_when/avoid_when=TBD`）
2. 智能体补全取舍字段并附可追溯证据；仅在自动化阻塞时人工补录
3. `scripts/harvest_to_quarantine.py --promote <file> --domain <domain>`
4. 把 id 挂进 `_index.yaml`
5. `scripts/validate_graph.py` 必须 OK 才能算入图谱

禁止：把 quarantine 文件直接当正式节点提交进 `data/domains/*/nodes/` 且字段仍为 TBD。
