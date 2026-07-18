from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def build_digest(state: dict, output_dir: Path, review_date: str) -> Path | None:
    events = list(state.get("events") or [])
    if not events:
        return None
    grouped = {"urgent": [], "important": [], "normal": []}
    for event in events:
        grouped.setdefault(str(event.get("priority")), []).append(event)

    lines = [
        f"# {review_date} 智能体变化报告审核",
        "",
        "- [ ] Codex 必须独立打开每条证据并核验，报告本身不能修改正式目录。",
        "",
    ]
    for priority, label in (("urgent", "紧急"), ("important", "重要"), ("normal", "普通")):
        lines.extend([f"## {label}", ""])
        if not grouped[priority]:
            lines.extend(["暂无。", ""])
            continue
        for event in grouped[priority]:
            issues = ", ".join(f"#{number}" for number in event.get("issue_numbers", [])) or "无"
            lines.extend(
                [
                    f"### {event['project_id']} · {event['change_type']}",
                    "",
                    f"- 观察值：{event['observed_value']}",
                    f"- 说明：{event['short_description']}",
                    f"- 证据：{event['evidence_url']}",
                    f"- 基线：`{event['baseline_hash']}`",
                    f"- 事件：`{event['fingerprint']}`",
                    f"- 确认数：{event['confirmations']}",
                    f"- 来源问题：{issues}",
                    "",
                ]
            )

    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / f"{review_date}.md"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=output_dir, prefix=f".{target.name}.", suffix=".tmp", delete=False
    ) as handle:
        temporary = Path(handle.name)
        handle.write("\n".join(lines).rstrip() + "\n")
    temporary.replace(target)
    return target


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", type=Path, default=ROOT / "var/feedback/open-events.json")
    parser.add_argument("--date", required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "var/feedback/digests")
    args = parser.parse_args()
    state = json.loads(args.state.read_text(encoding="utf-8"))
    result = build_digest(state, args.output, args.date)
    print(result if result else "no material changes; no digest created")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
