# 每日变化报告审核

默认采用“智能体审核 + 可追溯证据”模式：智能体独立打开证据并核验；仅在权限、登录或平台限制导致自动化阻塞时，才由人工最小化介入。

选择固定时间运行一次：

```bash
.venv/bin/python scripts/export_catalog_v1.py
.venv/bin/python scripts/import_github_feedback.py
.venv/bin/python scripts/build_daily_change_digest.py --date YYYY-MM-DD
```

没有重大变化时不会生成空的日报。重复报告在进入日报前已经合并，单一事件最多保留五个确认来源。

对日报中的每一项依次处理：

1. Codex 独立打开证据 URL，不信任报告结论本身。
2. 对照当前节点及报告携带的 `baseline_hash`，记录核验证据链。
3. 判断为真实变化、误报或目录已经修复。
4. 真实变化只编辑受影响的正式记录，并运行图谱校验、测试和检索评测。
5. 提交正式数据变化，在 Git commit 正文记录证据 URL 与核验结论。
6. 第一次运行 `finish_change_event.py` 时不加 `--delete-github-issues`；这只预览删除命令，不写核验记录，不清理本地事件。
7. 检查它打印的 GitHub issue 删除命令。
8. 确认无误后，加 `--delete-github-issues` 再运行。只有远程 issue 全部删除成功后才写核验记录并清理事件；中途失败会保留剩余 issue 编号供重试。
9. 提交 `data/verification/YYYY-MM.jsonl` 中新增的简短核验记录。

报告不能自动修改 YAML，未解决的事件不能删除。只有一份日报中的所有事件都解决后，临时日报才会清理。
