# Research Worker Connection

The research worker is a GitHub Actions job, not a VS Code process and not a
local Pi session. Each run starts a short-lived Linux runner, reads the next
public GitHub repository page, asks the configured DeepSeek model to enrich
the evidence, and writes one immutable batch to the repository's long-lived
`data/research-*` pull request.

## Required Secrets

Configure one repository secret before enabling the schedule:

```text
DEEPSEEK_API_KEY=<the provider key; never commit it>
```

The workflow uses these fixed runtime values:

```text
DEEPSEEK_BASE_URL=https://api.8j.ink/v1
DEEPSEEK_MODEL=deepseek-v4-pro
```

`GITHUB_TOKEN` is supplied by Actions for this repository only. The worker
uses it for GitHub API reads and Git Database writes; it is never included in
the DeepSeek request body.

## Durable Loop

The schedule runs every 15 minutes and has one concurrency slot. A run handles
one configured batch, stores the actual API queue and `next_since` cursor in a
manifest, then creates or advances the single accumulation pull request. A
later run discovers that PR and resumes from its latest manifest. Temporary
runner files disappear after the job; the GitHub branch and manifest are the
durable checkpoint.

Duplicates are rejected by the trusted boundary validator using the numeric
GitHub repository ID and accepted manifest history. The public Pages site is a
post-release probe, not the source of truth for deduplication. Unreviewed
research remains outside `main` and is not included in the website build.

## Local Safety

`scripts/research_worker.py --mode full-batch` refuses to run outside GitHub
Actions. This prevents a local window from accidentally creating a partial
batch or treating `/private/tmp` as production storage. The only local-safe
operations are unit tests and read-only inspection.
