# DeepSeek 数据生产工作说明

- 执行者：GPT-5.2 / DeepSeek 数据任务
- 唯一职责：公开仓库研究、结构化整理、批次校验、数据分支和 PR
- 不负责：Schema、程序、网站、GitHub Actions、Cloudflare、审核、合并、发布、域名或商业运营

## 1. 与审核发布任务的边界

| DeepSeek 数据生产工 | GPT-5.6 审核发布任务 |
|---|---|
| 领取仓库 ID 队列并逐仓研究 | 制定和更新 Schema、分类和质量门槛 |
| 读取公开证据并填固定 dossier | 自动校验全部记录，抽检和裁决冲突 |
| 输出 quarantine 批次和 manifest | 决定退回、接受、提升或排除 |
| 推送数据分支、创建 PR | 合并 PR、生成正式图谱和快照 |
| 维护游标、失败队列和续跑断点 | 修复 GitHub 与 Cloudflare Pages 连通 |
| 不碰生产和标准 | 验证 `main → verify → pages-deploy → 线上站` |

数据生产工不得因为“顺手”修改标准或发布系统。审核发布任务不得要求数据工登录 Cloudflare、处理 Token 或绕过保护分支。

## 2. 仓库领取与去重

输入队列的最小单位为 GitHub 数字仓库 ID。顺序扫描使用 GitHub `GET /repositories?since=<cursor>&per_page=100`，只处理响应实际返回的公开仓库；ID 可能稀疏，不能把起止 ID 的整数区间当成仓库清单。持续积累分支的第一批使用 `worker-config.enumeration.initial_since` 或 main 中最近已接受 manifest 的 `next_since`；同一分支后续批次严格使用该分支上一批 manifest 的 `next_since`。不得跳过中间批次，也不得只依赖关键词搜索或 star 排序冒充全量覆盖。

去重键固定为：

```text
platform = github
platform_repository_id = GitHub 数字 repository id
```

`owner/name`、URL 和默认分支是可变属性。遇到改名或组织转移，更新规范地址并记录 redirect；同一数字 ID 不能产生两条记录。fork、镜像和 monorepo 组件按照证据记录关系，不凭名称猜测独立身份。

## 3. 单仓库读取顺序

1. GitHub repository API：数字 ID、node ID、full name、规范 URL、默认分支、fork/archived/disabled、topics、时间戳和许可证信号。
2. 默认分支 HEAD：记录 commit OID，后续文本证据尽量固定到该 OID。
3. README：用途、能力、项目形态、支持语言、明确限制和文档入口。
4. LICENSE/COPYING/NOTICE 与官方许可说明：SPDX、双许可、版本边界和附加条款。
5. Releases/Tags 与支持政策：稳定版、LTS、预发布、EOL 和许可变化。
6. 正式文档：安装、部署、平台、运行时、协议、数据类型和本地化能力。
7. SECURITY、公开 advisory 或维护者公告：安全支持范围和已知重大状态。
8. 明确关系证据：上游、fork、替代、依赖、集成、后继和同生态。

不执行外部代码或 README 命令，不安装依赖，不运行外部 Action，不以运行结果填字段。单个文本响应应限制大小；超时、权限、重定向循环或非文本内容进入失败记录。

## 4. `research-dossier-v1` 固定结构

JSONL 每行一个 JSON 对象，必须包含以下顶级键，禁止自由增加同义字段：

```json
{
  "schema_version": "research-dossier-v1",
  "batch_id": "github-000000000001-000000000020",
  "record_status": "complete",
  "observed_at": "2026-07-22T12:00:00Z",
  "repository": {},
  "localized_content": {},
  "classification": {},
  "technology": {},
  "delivery": {},
  "platforms": {},
  "natural_language_support": {},
  "licensing": {},
  "releases": [],
  "lifecycle": {},
  "security": {},
  "quality": {},
  "relations": [],
  "evidence": [],
  "field_states": {},
  "worker_notes": []
}
```

### 4.1 `repository`

必填字段：

```json
{
  "platform": "github",
  "platform_repository_id": "123456",
  "platform_node_id": "R_...",
  "full_name": "owner/repo",
  "canonical_url": "https://github.com/owner/repo",
  "name_history": [],
  "default_branch": "main",
  "default_branch_oid": "40-hex-commit",
  "visibility": "public",
  "is_fork": false,
  "fork_parent_repository_id": null,
  "mirror_url": null,
  "archived": false,
  "disabled": false,
  "created_at": "ISO-8601 or null",
  "updated_at": "ISO-8601 or null",
  "pushed_at": "ISO-8601 or null"
}
```

无法取得 `platform_node_id`、默认分支或 OID 时填 `null`，并把相应 `field_states` 设为 `unknown`。只有 `fork_parent_repository_id=null` 和 `mirror_url=null` 可以在 GitHub API 明确证明“不是 fork/不是镜像”时设为 `verified`；其他 `null` 一律表示 unknown。数字 ID 必须以十进制字符串保存，避免不同工具的整数范围问题。

仓库没有已取证的改名或转移历史时，`name_history` 使用空数组。只有取得旧地址、重定向或维护者公告等直接证据时才添加：

```json
{
  "full_name": "old-owner/old-name",
  "canonical_url": "https://github.com/old-owner/old-name",
  "observed_until": "ISO-8601",
  "evidence_ids": ["ev-rename"]
}
```

### 4.2 `localized_content`

```json
{
  "name": {"zh-CN": "项目显示名", "en": "Project name"},
  "summary": {"zh-CN": "一句客观摘要", "en": "One factual sentence."},
  "use_when": {"zh-CN": ["适用条件"], "en": ["Use condition"]},
  "avoid_when": {"zh-CN": ["不适用条件"], "en": ["Avoid condition"]}
}
```

中文为默认，但中英文必须表达相同事实。不得把没有证据的评价写成“最佳、领先、企业级、安全”。`use_when`/`avoid_when` 是解释，不替代结构化筛选字段。

### 4.3 分类、技术、部署与平台

全部使用字符串数组，无事实时使用空数组并在 `field_states` 标注 `unknown`：

```json
{
  "classification": {
    "domain_ids": [], "subdomain_ids": [], "task_ids": [],
    "capability_ids": [], "project_types": []
  },
  "technology": {
    "programming_languages": [], "frameworks": [], "runtimes": [],
    "protocols": [], "data_types": []
  },
  "delivery": {
    "modes": [], "package_formats": [], "orchestrators": []
  },
  "platforms": {
    "operating_systems": [], "execution_targets": [],
    "cpu_architectures": [], "accelerators": []
  }
}
```

只使用 `schema/research-taxonomy-v1.json` 已有值。`subdomain_ids` 使用 `<domain_id>:<category_id>`，例如 `devtools:lang-tooling`，避免跨领域重名。缺词时写 `worker_notes`，不得自己创造近义枚举。

### 4.4 自然语言支持

```json
{
  "natural_language_support": {
    "zh-CN": {"ui": "unknown", "docs": "partial", "community": "unknown"},
    "en": {"ui": "unknown", "docs": "full", "community": "unknown"}
  }
}
```

覆盖等级只允许 `full | partial | none | unknown`。界面、文档、社区必须分别判断；不能因存在中文 README 就填写中文 UI。

`record_status` 只允许 `complete | unknown | conflicting`，并直接决定 manifest 的对应计数。完全无法取得仓库身份时不生成 dossier，写入 manifest `failures`。

### 4.5 许可证与版本

```json
{
  "licensing": {
    "openness": "open-source",
    "current_expression": "Apache-2.0",
    "version_rules": [
      {"version_range": ">=1.0.0", "expression": "Apache-2.0", "evidence_ids": ["ev-license"]}
    ],
    "additional_terms": [],
    "obligations_source": "not-provided-by-worker"
  },
  "releases": [
    {"version": "1.2.3", "channel": "stable", "released_at": "ISO-8601", "support": "supported", "evidence_ids": ["ev-release"]}
  ]
}
```

`openness` 只允许 `open-source | open-core | source-available | no-license | unknown | conflicting`。`additional_terms` 只记录官方明确存在的附加条款标识或简短事实，并引用证据。`obligations_source` 固定为 `not-provided-by-worker`；商用、修改、分发、署名、源码公开、网络公开源码和专利义务由 GPT-5.6 审核端根据受控许可证规则派生，DeepSeek 不填写。Release `channel` 只允许 `stable | lts | prerelease | nightly | unknown`，`support` 只允许 `supported | security-only | eol | unknown`。没有直接许可证据时必须 unknown，不能提供法律结论。

### 4.6 生命周期、安全和质量

```json
{
  "lifecycle": {
    "status": "active", "latest_activity_at": "ISO-8601 or null",
    "maintenance_model": "unknown"
  },
  "security": {
    "security_policy": "present", "advisory_source": "github",
    "supported_versions_known": false
  },
  "quality": {
    "maturity": "unknown", "production_claim": "unknown",
    "known_limitations": []
  }
}
```

生命周期只允许 `active | maintenance | inactive | archived | unknown | conflicting`。安全政策只允许 `present | absent | unknown`。成熟度只允许 `experimental | early | stable | mature | unknown`。没有官方支持矩阵时不得通过“最近有提交”推断生产可用。

### 4.7 关系、证据和字段状态

```json
{
  "relations": [
    {"type": "fork_of", "target_repository_id": "42", "evidence_ids": ["ev-api"]}
  ],
  "evidence": [
    {
      "id": "ev-license",
      "url": "https://raw.githubusercontent.com/owner/repo/<commit>/LICENSE",
      "source_type": "license_file",
      "retrieved_at": "ISO-8601",
      "applies_to": ["licensing.current_expression"],
      "version_range": ">=1.0.0",
      "fact": "Repository license file identifies Apache License 2.0.",
      "content_sha256": "64-hex or null"
    }
  ],
  "field_states": {
    "licensing.current_expression": {"state": "verified", "evidence_ids": ["ev-license"]}
  }
}
```

关系类型只允许当前图谱关系加 `fork_of | mirror_of | component_of`。证据类型只允许 `repository_api | repository_commit | readme | license_file | notice_file | release | documentation | security_policy | advisory | maintainer_announcement`。`repository_api` 只证明仓库元数据，`repository_commit` 只证明默认分支 OID；README、许可证、安全文件和公告只能支持与其来源类型兼容的字段。字段状态只允许 `verified | inferred | unknown | conflicting | stale`。

所有影响筛选的非 unknown 字段必须在 `field_states` 中出现并引用至少一个存在的证据 ID。`inferred` 只用于证据支持但未直接明说的低风险分类，不得用于许可证义务、安全结论或版本支持。

`name_history`、每条 `version_rules`、每条 release 和每条 relation 的 `evidence_ids` 都不得为空；引用的 evidence 还必须在 `applies_to` 中声明对应父路径，例如 `repository.name_history`、`licensing.version_rules`、`releases` 或 `relations`。`conflicting` 字段必须至少引用两个不同证据。

## 5. 批次文件与 manifest

产物：

```text
data/quarantine/research/<batch_id>.jsonl
data/quarantine/research/<batch_id>.manifest.json
```

Manifest 固定结构：

```json
{
  "schema_version": "research-batch-manifest-v1",
  "batch_id": "github-000000000101-000000000498-0001",
  "created_at": "ISO-8601",
  "input": {
    "source": "github-public-repositories",
    "since": "0",
    "repository_ids": ["101", "119", "132", "144", "155", "171", "203", "219", "238", "251", "277", "298", "319", "337", "352", "379", "401", "428", "451", "498"],
    "first_repository_id": "101",
    "last_repository_id": "498"
  },
  "counts": {"total": 20, "complete": 12, "unknown": 5, "conflicting": 1, "failed": 2, "skipped": 0},
  "artifact": {"path": "data/quarantine/research/<batch_id>.jsonl", "bytes": 12345, "sha256": "64-hex"},
  "rate_limit": {
    "resource": "core", "limit": 5000, "remaining": 4871,
    "reset_at": "ISO-8601", "observed_at": "ISO-8601"
  },
  "next_since": "498",
  "failures": [
    {"repository_id": "451", "reason": "http-timeout", "retry_after": "ISO-8601", "attempts": 3},
    {"repository_id": "498", "reason": "repository-unavailable", "retry_after": null, "attempts": 1}
  ],
  "worker": {
    "model_role": "deepseek-data-worker",
    "program_version": "deepseek-data-worker-v1",
    "run_id": "stable run identifier"
  }
}
```

`worker.program_version` 记录实际生产程序版本；`counts.skipped` 当前固定为 `0`，不得用跳过掩盖未处理 ID；`rate_limit` 保存本批最后一次 GitHub `core` 配额快照。`artifact.path/bytes/sha256` 就是本批输出清单与校验和，不再重复增加另一套清单字段。一个仓库即使大量 unknown，只要身份和证据边界诚实，也应保留 dossier 并计入 `unknown`。完全无法取得身份或公开元数据时计入 `failed`，并记录 `failures.attempts` 的实际有界尝试次数，不得伪造空记录。失败项留在已接受 manifest 中成为可见缺口；当前顺序扫描继续前进，不把旧 ID 偷塞进下一页。当前批次在 manifest 封存前按本节执行有界重试；已经封存的失败项不在本轮静默重开，后续重试须等待 GPT-5.6 发布独立失败重试协议。

## 6. 校验、分支和 PR

提交前运行 `.venv/bin/python scripts/validate_research_batch.py <jsonl> <manifest>`。验证器检查：JSONL 每行可解析；顶级键完整且无额外同义键；仓库数字 ID 在批内和已接受历史中唯一；枚举合法；证据 ID 唯一；所有引用闭合；非 unknown 决策字段有证据；`record_status` 与字段状态一致；manifest 队列覆盖、计数、程序版本、速率限制快照、失败尝试次数、字节数、SHA-256 和游标正确；批次大小符合配置；无 Token、私人路径或账户资料。

本地校验用于尽早发现格式问题，不能自行证明队列来自 GitHub。PR 的受信任 CI 会从 base 分支加载 Schema、词表、配置和验证器，重新调用 GitHub API，强制比对队列顺序、数字 ID、node ID、full name、规范 URL、默认分支及 OID、公开性、fork 父仓库、镜像、归档、禁用状态与时间戳。门禁每次离线重放相对 `main` 的全部新增批次；首次打开 PR时在线复核唯一首批，以后每次 synchronize 只在线复核本次唯一直接后继批次，并要求前一个 exact head 已有成功的可信 `research-boundary` workflow run。最终一页不足当前批量时，只有在线响应本身不足该数量才允许较小批次。DeepSeek 不得关闭、修改或替代这项在线复核。

```text
branch: data/research-<YYYYMMDD>-accumulation
commit: data: research batch <batch_id>
PR:     data: research accumulation
```

分支必须从当时最新 `origin/main` 创建，长期只维护一个开放的持续积累 PR。首次 PR恰好只有一个批次提交，以后每次 push 恰好增加一个直接后继批次；已推送提交和批次不可修改、重写、变基或强推。每批通过本地校验后提交并推送，必须等待该 exact head 的 `research-boundary` 成功后才开始推送下一批；不得把多个尚未通过的提交排队。受信任 CI自动离线验证该分支相对 `main` 的全部新增批次，并在线复核本次新批次；通过后直接继续下一批，不等待 GPT-5.6。用户要求接手审核时，DeepSeek停止继续推送并记录冻结提交 SHA；GPT-5.6集中审核整个冻结范围。审核通过则合并并关闭本轮 PR，审核退回则关闭或按审核结论重建；关闭后的研究 PR不得 reopen，再次启动 DeepSeek时必须从新的 `origin/main`创建下一轮持续积累分支。未审核数据不得进入正式图谱或网站。

## 7. 质量与 24/7 持续运行

- 批次大小必须等于 `worker-config.batch.current_repositories`；初始为 20，三个批次均通过审核后由 GPT-5.6 调为 50，稳定后最多 100 或 5 MiB。
- 主工作者写当前批次；唯一子代理只读准备下一批或抽查当前批次。
- 每处理完一个仓库立即更新临时断点；每完成一批原子提交并推送。
- 限流按响应头退避并在本批内做有界重试；仍失败的项目写 manifest，不能私自改变下一批的顺序游标。
- 不因为额度无限而缩短证据、合并字段、放宽 unknown 或跳过双语。
- 队列未穷尽且权限允许时持续工作；状态汇报不能代替数据产物，也不能触发自动停止。
- 平台保持 `approval_policy = "on-request"`。DeepSeek 不得主动发起批准请求；需要批准或越界的动作记入 blocker 后跳过，继续无需批准的公开数据任务。

### 7.1 永久工作循环

DeepSeek 接手后必须把任务视为一个不可提前结束的永久循环，而不是“一批一停”的脚本。只要公开枚举没有被实际 API 响应证明穷尽，或存在未收口批次、未通过可信 `research-boundary` 的提交、当前批次内可重试失败项，就必须继续领取、取证、校验、提交、等待门禁并领取下一批。完成一批、创建或更新 PR、发送状态、额度充足、上下文窗口结束、模型/子代理重启、浏览器或网络短暂中断、GitHub 限流和 CI 排队都不是停止条件。

“24/7”由外部运行监督器实现：模型调用结束或进程被重启时，监督器必须在可用时重新唤醒同一个任务；DeepSeek 不能假装在已经结束的进程中继续工作。每次恢复都必须从 GitHub、工作区、开放 PR、manifest 和 durable checkpoint 重新构建状态，不能使用旧对话、旧游标或记忆中的 PR 号作为事实。普通状态询问不等于用户要求 GPT-5.6 接管审核。

每次让出执行权、上下文将满、网络暂时不可用或准备发送状态前，必须先保存 `continuous-goal-checkpoint-v1`。它是运行监督器的持久元数据，不是第三类仓库产物，不得提交到 `data/quarantine/research/`；若运行环境不提供该存储，则只能从最近已接受 manifest、PR exact head 和当前批次输入页幂等恢复，不能声称已具备跨重启连续性。至少保存以下字段：

```text
branch
batch_id
current_repository_id       # 无进行中仓库时为 null
next_since                  # 最近已接受 manifest 的游标，不能是猜测值
last_committed_sha
last_research_boundary      # head_sha, run_id, conclusion, completed_at
failures                    # 每项含 repository_id, reason, retry_after, attempts
pr_number
pr_head_sha
phase                       # enumerating | researching | validating | awaiting-boundary | blocked | frozen
updated_at
```

在批次尚未提交时，只能把最近已接受 manifest 的游标写入 `next_since`；当前仓库和临时批次位置另由 `current_repository_id` 与 `batch_id` 表示。恢复后先验证 PR head 和门禁结论，再继续同一批，禁止跳过 ID、推进未验证游标、重写已推送提交或静默清空 failures。失败项必须保留真实 `reason`、有界 `attempts` 和 `retry_after`；在当前规则允许重试时重试，无法自动解决时进入可见最终失败队列。

只有以下情况允许暂停循环，并且暂停前必须收口 checkpoint：

1. 公开枚举 API 的实际响应证明没有下一页，所有已返回 ID 都已有 dossier 或有证据的最终失败记录，且没有可重试失败、未收口批次或未验证提交。
2. 用户明确要求 GPT-5.6 接手集中审核；DeepSeek 必须停止继续推送并冻结、报告 exact PR head SHA。用户仅询问进度、要求汇报或说“继续”都不构成接管。
3. 无法由公开读取、有限重试或当前权限自动解决的外部 blocker，且已记录 `worker-blocker`、证据、尝试次数、恢复条件和下一动作；只要仍有不依赖它的安全工作，就不得暂停。

不得把“一亿”或“一亿多”写成静态完成数。正确的完成定义是队列穷尽加上每个已领取 ID 的可追溯结果；最终失败是公开可见的缺口，不得伪装成已研究成功。暂停条件解除、重试时间到达或新上下文可用后，监督器必须从 checkpoint 自动恢复，不需要用户重新批准。
