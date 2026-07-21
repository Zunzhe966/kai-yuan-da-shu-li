# Remote API smoke (D8, historical snapshot)

Date: 2026-07-12. This record captures an early local smoke test and does not describe the current public site or catalog size. For current state, read `dist/v1/meta.json`, the public `api/v1/meta.json`, and `docs/operations/operations-status.md`.

## Static index

- file: `dist/atlas-index.json`
- counts: nodes=96 edges=88 domains=3
- historical public URL at the time: `https://raw.githubusercontent.com/Zunzhe966/kaiyuan-dashuli/main/dist/atlas-index.json` (the old GitHub path redirects; do not use it for new links)

## HTTP API (`scripts/http_api.py`)

Observed earlier in-session:

| Call | Result |
|---|---|
| `GET /health` | ok |
| `GET /v1/meta` | domains = ai-agents, devops, web-frontend |
| `GET /v1/search?q=本地笔记本跑模型&domain=ai-agents&limit=2` | open-webui, ollama |
| `GET /v1/nodes/nextjs` | id=nextjs |
| `GET /v1/alternatives/react` | vue, svelte |

PASS
