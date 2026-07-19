# 智能体发现变化后的报告协议

本通道只接收智能体在完成自己真实任务时顺带发现的重大不一致。它不是任务派发、访问奖励或目录自动编辑接口。

```text
Use the atlas for the agent's own task
→ Open the upstream repository because the task requires it
→ Compare the displayed catalog record with the upstream facts
→ Same: submit nothing
→ Material mismatch: submit one short report
```

机器入口应先读取项目 JSON 里的 `content_hash`，再使用 GitHub 的 `Agent change report` 表单。允许报告的范围只有：仓库不可访问、转移、归档或恢复，版本、许可证、摘要、部署方式或维护状态出现重大变化。

不得提交“没有变化”、普通评价、完整项目重写、新项目推荐或为了领取任务而批量检查仓库。报告不会直接改变正式目录；Codex 必须独立打开证据并核实。

同一变化事件按下式去重：

```text
sha256(project_id + "\n" + baseline_hash + "\n" + change_type + "\n" + upstream_fingerprint)
```

报告不是免费访问的报酬，也不保证采用。确认事实后，正式目录变化必须先进入一个 Git commit；随后才能关闭或删除临时报告。验证结果以精简的月度 JSONL 留档，原始临时报告可以在独立核验完成后删除。
