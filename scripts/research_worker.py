#!/usr/bin/env python3
"""Continuous research worker: enumerate GitHub repos, collect evidence, produce
research-dossier-v1 batches, and commit them via Git Database API.

Runs in GitHub Actions (schedule or workflow_dispatch). Uses GITHUB_TOKEN for
GitHub API access and the configured DEEPSEEK_API_KEY for required enrichment.

Flow:
  discover state → enumerate → collect evidence → build dossiers →
  create blobs → tree → commit → update ref → create/update PR
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
WORKER_CONFIG_PATH = ROOT / "data/quarantine/research/worker-config.json"
GITHUB_REPO = "Zunzhe966/kai-yuan-da-shu-li"

GITHUB_API = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5
WORKER_VERSION = "research-worker-v1.1.0-deepseek"

CONTENT_PATHS = (
    "localized_content.name",
    "localized_content.summary",
    "localized_content.use_when",
    "localized_content.avoid_when",
    "classification.domain_ids",
    "classification.subdomain_ids",
    "classification.task_ids",
    "classification.capability_ids",
    "classification.project_types",
    "technology.programming_languages",
    "technology.frameworks",
    "technology.runtimes",
    "technology.protocols",
    "technology.data_types",
    "delivery.modes",
    "delivery.package_formats",
    "delivery.orchestrators",
    "platforms.operating_systems",
    "platforms.execution_targets",
    "platforms.cpu_architectures",
    "platforms.accelerators",
    "natural_language_support.zh-CN.ui",
    "natural_language_support.zh-CN.docs",
    "natural_language_support.zh-CN.community",
    "natural_language_support.en.ui",
    "natural_language_support.en.docs",
    "natural_language_support.en.community",
    "lifecycle.status",
    "lifecycle.maintenance_model",
    "quality.maturity",
    "quality.production_claim",
    "quality.known_limitations",
    "relations",
)

REPOSITORY_API_PATHS = (
    "repository.platform_repository_id",
    "repository.platform_node_id",
    "repository.full_name",
    "repository.canonical_url",
    "repository.default_branch",
    "repository.visibility",
    "repository.is_fork",
    "repository.fork_parent_repository_id",
    "repository.mirror_url",
    "repository.archived",
    "repository.disabled",
    "repository.created_at",
    "repository.updated_at",
    "repository.pushed_at",
    "lifecycle.latest_activity_at",
)

RATE_LIMIT_SNAPSHOT: dict[str, Any] = {
    "resource": "core",
    "limit": 0,
    "remaining": 0,
    "reset_at": None,
    "observed_at": None,
}


# ─── helpers ────────────────────────────────────────────────────────────

def _gh_headers() -> dict[str, str]:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        raise RuntimeError("GITHUB_TOKEN not set")
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "kai-yuan-da-shu-li-worker/1.0",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }


def _update_rate_limit(headers: Any) -> None:
    """Keep the last real GitHub core-quota snapshot for the manifest."""
    def integer(name: str) -> int | None:
        try:
            value = headers.get(name)
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    limit = integer("X-RateLimit-Limit")
    remaining = integer("X-RateLimit-Remaining")
    reset = integer("X-RateLimit-Reset")
    if limit is not None:
        RATE_LIMIT_SNAPSHOT["limit"] = limit
    if remaining is not None:
        RATE_LIMIT_SNAPSHOT["remaining"] = remaining
    if reset is not None:
        RATE_LIMIT_SNAPSHOT["reset_at"] = datetime.fromtimestamp(
            reset, tz=timezone.utc
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
    RATE_LIMIT_SNAPSHOT["observed_at"] = _now_iso()


def _fetch_json(url: str, timeout: int = 30) -> Any:
    return _fetch_json_core(url, timeout, _gh_headers())


def _fetch_json_core(url: str, timeout: int, headers: dict[str, str]) -> Any:
    for attempt in range(1, MAX_RETRIES + 1):
        # Rate-limit pre-check: wait if quota is exhausted
        _wait_rate_limit()
        req = Request(url, headers=headers)
        try:
            with urlopen(req, timeout=timeout) as resp:
                _update_rate_limit(resp.headers)
                return json.load(resp)
        except HTTPError as exc:
            _update_rate_limit(exc.headers)
            if exc.code in (403, 429) and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                print(f"  rate-limited ({exc.code}), waiting {delay}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise
        except (URLError, OSError) as exc:
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                print(f"  network error: {exc}, waiting {delay}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise
    raise RuntimeError(f"max retries exceeded for {url}")


def _wait_rate_limit() -> None:
    remaining = RATE_LIMIT_SNAPSHOT.get("remaining", 0)
    if not isinstance(remaining, int):
        remaining = 0
    if remaining > 5:
        return
    reset_str = RATE_LIMIT_SNAPSHOT.get("reset_at")
    if not reset_str:
        time.sleep(60)
        return
    try:
        reset_dt = datetime.fromisoformat(reset_str)
    except (ValueError, TypeError):
        time.sleep(60)
        return
    wait_sec = max(0, (reset_dt - datetime.now(timezone.utc)).total_seconds() + 2)
    if wait_sec > 3600:
        wait_sec = 3600
    if wait_sec > 0:
        print(f"  rate-limit exhausted, waiting {int(wait_sec)}s until {reset_str}")
        while wait_sec > 0:
            chunk = min(wait_sec, 60)
            time.sleep(chunk)
            wait_sec -= chunk


def _gh_get(path: str) -> Any:
    return _fetch_json(f"{GITHUB_API}{path}")


def _gh_post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    return _gh_post_core(path, body, _gh_headers())


def _gh_post_core(path: str, body: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    for attempt in range(1, MAX_RETRIES + 1):
        _wait_rate_limit()
        req = Request(
            f"{GITHUB_API}{path}",
            data=data,
            headers={**headers, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=30) as resp:
                _update_rate_limit(resp.headers)
                return json.load(resp)
        except HTTPError as exc:
            _update_rate_limit(exc.headers)
            if exc.code == 429 and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                print(f"  rate-limited (429), waiting {delay}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise


def _gh_patch(path: str, body: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    _wait_rate_limit()
    req = Request(
        f"{GITHUB_API}{path}",
        data=data,
        headers={**_gh_headers(), "Content-Type": "application/json"},
        method="PATCH",
    )
    with urlopen(req, timeout=30) as resp:
        _update_rate_limit(resp.headers)
        return json.load(resp)


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _rate_limit_snapshot() -> dict[str, Any]:
    snapshot = dict(RATE_LIMIT_SNAPSHOT)
    now = _now_iso()
    snapshot["reset_at"] = snapshot.get("reset_at") or now
    snapshot["observed_at"] = snapshot.get("observed_at") or now
    return snapshot


def _deepseek_settings() -> tuple[str, str, str]:
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.8j.ink/v1").rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro").strip()
    if not key:
        raise RuntimeError(
            "DEEPSEEK_API_KEY is required; refusing to create an evidence-only batch"
        )
    if not model:
        raise RuntimeError("DEEPSEEK_MODEL must not be empty")
    return key, base_url, model


def _deepseek_json(prompt: str) -> dict[str, Any]:
    """Call the configured OpenAI-compatible DeepSeek endpoint."""
    key, base_url, model = _deepseek_settings()
    body = json.dumps(
        {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "你是开源项目证据整理工。只能根据提供的公开证据回答，"
                        "不猜测许可证义务、安全结论或项目关系。只返回 JSON。"
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 3000,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = Request(
        urljoin(base_url + "/", "chat/completions"),
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "kai-yuan-da-shu-li-research-worker/1.1",
        },
        method="POST",
    )
    with urlopen(req, timeout=90) as resp:
        payload = json.load(resp)
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("DeepSeek response did not contain message content") from exc
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("DeepSeek returned empty content")
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE)
    try:
        result = json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"DeepSeek returned non-JSON content: {exc}") from exc
    if not isinstance(result, dict):
        raise RuntimeError("DeepSeek response must be a JSON object")
    return result


def _load_config() -> dict[str, Any]:
    return json.loads(WORKER_CONFIG_PATH.read_text(encoding="utf-8"))


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _batch_id(since: str, first_id: str) -> str:
    return f"github-since-{since}-{first_id}"


def _date_branch() -> str:
    return f"data/research-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}-accumulation"


def _api_path(path: str) -> str:
    return f"/repos/{GITHUB_REPO}{path}"


# ─── state discovery ────────────────────────────────────────────────────

def _get_main_sha() -> str:
    ref_data = _gh_get(_api_path("/git/ref/heads/main"))
    return ref_data["object"]["sha"]


def _find_research_pr() -> dict[str, Any] | None:
    pulls = _gh_get(f"/repos/{GITHUB_REPO}/pulls?state=open&base=main&per_page=100")
    for pr in pulls:
        head_ref = pr.get("head", {}).get("ref", "")
        if head_ref.startswith("data/research-"):
            return pr
    return None


def _get_branch_sha(branch: str) -> str | None:
    try:
        ref_data = _gh_get(_api_path(f"/git/ref/heads/{branch}"))
        return ref_data["object"]["sha"]
    except HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def _read_manifest_cursor(commit_sha: str) -> str | None:
    """Read next_since from most recent manifest on a given commit."""
    try:
        tree_data = _gh_get(_api_path(f"/git/trees/{commit_sha}?recursive=1"))
    except HTTPError:
        return None

    manifests = []
    for item in tree_data.get("tree", []):
        path = item.get("path", "")
        if path.startswith("data/quarantine/research/") and path.endswith(".manifest.json"):
            manifests.append((path, item["sha"]))

    if not manifests:
        return None

    manifests.sort(key=lambda x: x[0], reverse=True)
    _, blob_sha = manifests[0]
    blob_data = _gh_get(_api_path(f"/git/blobs/{blob_sha}"))
    content = blob_data.get("content", "")
    import base64
    raw = base64.b64decode(content).decode("utf-8")
    manifest = json.loads(raw)
    return manifest.get("next_since")


# ─── enumeration ────────────────────────────────────────────────────────

def _enumerate_repos(since: str, per_page: int = 100) -> list[dict[str, Any]]:
    url = f"{GITHUB_API}/repositories?since={since}&per_page={per_page}"
    data = _fetch_json(url, timeout=60)
    if not isinstance(data, list):
        raise ValueError(f"GitHub enumeration returned non-array: {type(data)}")
    return data


# ─── evidence collection ────────────────────────────────────────────────

def _collect_evidence(repo: dict[str, Any]) -> dict[str, Any]:
    repo_id = str(repo["id"])
    full_name = repo["full_name"]
    default_branch = repo.get("default_branch", "main")
    observed_at = _now_iso()

    evidence = {}

    evidence["repository_api"] = {
        "id": f"ev-{repo_id}-api",
        "url": f"https://api.github.com/repositories/{repo_id}",
        "source_type": "repository_api",
        "retrieved_at": observed_at,
        "applies_to": ["repository"],
        "version_range": None,
        "fact": json.dumps({
            k: repo.get(k) for k in ["id", "node_id", "full_name", "description",
                                       "language", "topics", "fork", "archived",
                                       "disabled", "created_at", "updated_at",
                                       "pushed_at", "visibility", "mirror_url",
                                       "license", "default_branch"]
        }, default=str),
        "content_sha256": _sha256_text(json.dumps(repo, sort_keys=True, default=str)),
    }

    branch_oid = None
    try:
        branch_data = _gh_get(f"/repos/{full_name}/git/ref/heads/{default_branch}")
        branch_oid = branch_data["object"]["sha"]
        evidence["repository_commit"] = {
            "id": f"ev-{repo_id}-branch",
            "url": f"https://api.github.com/repos/{full_name}/git/refs/heads/{default_branch}",
            "source_type": "repository_commit",
            "retrieved_at": observed_at,
            "applies_to": ["repository.default_branch_oid"],
            "version_range": None,
            "fact": f"HEAD: {branch_oid}",
            "content_sha256": _sha256_text(branch_oid),
        }
    except HTTPError as exc:
        print(f"  [{repo_id}] cannot read default branch: HTTP {exc.code}")

    try:
        readme = _gh_get(f"/repos/{full_name}/readme")
        import base64
        readme_text = base64.b64decode(readme["content"]).decode("utf-8", errors="replace")
        evidence["readme"] = {
            "id": f"ev-{repo_id}-readme",
            "url": readme.get("html_url", ""),
            "source_type": "readme",
            "retrieved_at": observed_at,
            "applies_to": ["localized_content", "classification", "technology", "delivery",
                           "platforms", "natural_language_support", "lifecycle", "quality"],
            "version_range": None,
            "fact": readme_text[:4000],
            "content_sha256": _sha256_text(readme_text),
        }
    except HTTPError:
        pass

    try:
        license_data = _gh_get(f"/repos/{full_name}/license")
        evidence["license_file"] = {
            "id": f"ev-{repo_id}-license",
            "url": license_data.get("html_url", ""),
            "source_type": "license_file",
            "retrieved_at": observed_at,
            "applies_to": ["licensing"],
            "version_range": None,
            "fact": f"SPDX: {license_data.get('license', {}).get('spdx_id', 'NOASSERTION')}",
            "content_sha256": _sha256_text(license_data.get("content", "")),
        }
    except HTTPError:
        pass

    try:
        _gh_get(f"/repos/{full_name}/contents/SECURITY.md?ref={default_branch}")
        evidence["security_policy"] = {
            "id": f"ev-{repo_id}-security",
            "url": f"https://github.com/{full_name}/blob/{default_branch}/SECURITY.md",
            "source_type": "security_policy",
            "retrieved_at": observed_at,
            "applies_to": ["security"],
            "version_range": None,
            "fact": "SECURITY.md present",
            "content_sha256": _sha256_text(default_branch),
        }
    except HTTPError:
        pass

    try:
        releases = _gh_get(f"/repos/{full_name}/releases?per_page=5")
        if releases:
            evidence["release"] = {
                "id": f"ev-{repo_id}-releases",
                "url": f"https://github.com/{full_name}/releases",
                "source_type": "release",
                "retrieved_at": observed_at,
                "applies_to": ["releases", "lifecycle"],
                "version_range": None,
                "fact": json.dumps([{
                    "tag_name": r.get("tag_name"),
                    "published_at": r.get("published_at"),
                    "prerelease": r.get("prerelease", False),
                } for r in releases[:5]], default=str),
                "content_sha256": _sha256_text(json.dumps(releases[:5], sort_keys=True, default=str)),
            }
    except HTTPError:
        pass

    return {
        "evidence": list(evidence.values()),
        "branch_oid": branch_oid,
    }


def _collect_evidence_v2(repo: dict[str, Any]) -> dict[str, Any]:
    """Collect bounded public evidence with validator-compatible paths.

    Uses enumeration data directly to avoid a redundant API call against
    the per-hour GITHUB_TOKEN quota.
    """
    repo_id = str(repo["id"])
    # Use enumeration payload directly — skip the extra GET /repositories/{repo_id}
    detail = repo
    full_name = detail["full_name"]
    default_branch = detail.get("default_branch") or "main"
    observed_at = _now_iso()
    evidence: list[dict[str, Any]] = []

    api_fact = json.dumps(
        {
            key: detail.get(key)
            for key in (
                "id", "node_id", "full_name", "html_url", "description", "language",
                "topics", "default_branch", "visibility", "fork", "parent", "mirror_url",
                "archived", "disabled", "created_at", "updated_at", "pushed_at", "license",
            )
        },
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )
    api_id = f"ev-{repo_id}-api"
    evidence.append(
        {
            "id": api_id,
            "url": f"https://api.github.com/repositories/{repo_id}",
            "source_type": "repository_api",
            "retrieved_at": observed_at,
            "applies_to": list(REPOSITORY_API_PATHS),
            "version_range": None,
            "fact": api_fact,
            "content_sha256": _sha256_text(api_fact),
        }
    )

    page_id = f"ev-{repo_id}-page"
    page_fact = json.dumps(
        {"full_name": full_name, "description": detail.get("description") or ""},
        ensure_ascii=False,
        sort_keys=True,
    )
    evidence.append(
        {
            "id": page_id,
            "url": f"https://github.com/{full_name}",
            "source_type": "documentation",
            "retrieved_at": observed_at,
            "applies_to": list(CONTENT_PATHS),
            "version_range": None,
            "fact": page_fact,
            "content_sha256": _sha256_text(page_fact),
        }
    )

    branch_oid: str | None = None
    try:
        branch_data = _gh_get(f"/repos/{full_name}/git/ref/heads/{default_branch}")
        branch_oid = branch_data["object"]["sha"]
        branch_fact = f"Default branch {default_branch} resolves to {branch_oid}."
        evidence.append(
            {
                "id": f"ev-{repo_id}-branch",
                "url": f"https://api.github.com/repos/{full_name}/git/ref/heads/{default_branch}",
                "source_type": "repository_commit",
                "retrieved_at": observed_at,
                "applies_to": ["repository.default_branch_oid"],
                "version_range": None,
                "fact": branch_fact,
                "content_sha256": _sha256_text(branch_fact),
            }
        )
    except HTTPError as exc:
        if exc.code != 404:
            raise

    try:
        readme = _gh_get(f"/repos/{full_name}/readme")
        readme_bytes = base64.b64decode(readme.get("content", ""), validate=False)
        readme_text = readme_bytes.decode("utf-8", errors="replace")[:8000]
        evidence.append(
            {
                "id": f"ev-{repo_id}-readme",
                "url": readme.get("html_url") or f"https://github.com/{full_name}",
                "source_type": "readme",
                "retrieved_at": observed_at,
                "applies_to": list(CONTENT_PATHS),
                "version_range": None,
                "fact": readme_text,
                "content_sha256": _sha256_text(readme_text),
            }
        )
    except HTTPError as exc:
        if exc.code != 404:
            raise

    license_expression: str | None = None
    try:
        license_data = _gh_get(f"/repos/{full_name}/license")
        license_expression = (license_data.get("license") or {}).get("spdx_id") or None
        license_fact = f"GitHub license signal: {license_expression or 'unknown'}."
        evidence.append(
            {
                "id": f"ev-{repo_id}-license",
                "url": license_data.get("html_url") or f"https://github.com/{full_name}",
                "source_type": "license_file",
                "retrieved_at": observed_at,
                "applies_to": [
                    "licensing.openness",
                    "licensing.current_expression",
                    "licensing.version_rules",
                    "licensing.additional_terms",
                ],
                "version_range": None,
                "fact": license_fact,
                "content_sha256": _sha256_text(license_fact),
            }
        )
    except HTTPError as exc:
        if exc.code != 404:
            raise

    security_url = f"https://github.com/{full_name}/blob/{default_branch}/SECURITY.md"
    security_present = True
    try:
        _gh_get(f"/repos/{full_name}/contents/SECURITY.md?ref={default_branch}")
    except HTTPError as exc:
        if exc.code == 404:
            security_present = False
        else:
            raise
    security_fact = (
        "SECURITY.md is present on the default branch."
        if security_present
        else "SECURITY.md was not found on the default branch; support matrix is not established."
    )
    evidence.append(
        {
            "id": f"ev-{repo_id}-security",
            "url": security_url,
            "source_type": "security_policy",
            "retrieved_at": observed_at,
            "applies_to": [
                "security.security_policy",
                "security.advisory_source",
                "security.supported_versions_known",
            ],
            "version_range": None,
            "fact": security_fact,
            "content_sha256": _sha256_text(security_fact),
        }
    )

    try:
        releases = _gh_get(f"/repos/{full_name}/releases?per_page=5")
    except HTTPError as exc:
        if exc.code != 404:
            raise
        releases = []
    if releases:
        release_fact = json.dumps(
            [
                {
                    "tag_name": item.get("tag_name"),
                    "published_at": item.get("published_at"),
                    "prerelease": item.get("prerelease", False),
                }
                for item in releases[:5]
            ],
            ensure_ascii=False,
            sort_keys=True,
        )
        evidence.append(
            {
                "id": f"ev-{repo_id}-releases",
                "url": f"https://github.com/{full_name}/releases",
                "source_type": "release",
                "retrieved_at": observed_at,
                "applies_to": ["releases"],
                "version_range": None,
                "fact": release_fact,
                "content_sha256": _sha256_text(release_fact),
            }
        )

    return {
        "repo": detail,
        "evidence": evidence,
        "branch_oid": branch_oid,
        "license_expression": license_expression,
        "security_present": security_present,
    }


# ─── dossier building ───────────────────────────────────────────────────

EMPTY_FS = {"state": "unknown", "evidence_ids": []}

def _build_dossier(repo: dict[str, Any], collected: dict[str, Any],
                   batch_id_val: str, observed_at: str) -> dict[str, Any]:
    repo_id = str(repo["id"])
    full_name = repo["full_name"]
    default_branch = repo.get("default_branch", "main")
    branch_oid = collected.get("branch_oid")
    description = repo.get("description") or ""
    license_obj = repo.get("license") or {}
    spdx_id = license_obj.get("spdx_id", "") if isinstance(license_obj, dict) else ""
    openness = "open-source" if (spdx_id and spdx_id not in ("NOASSERTION", "")) else "unknown"

    evidence_list = collected["evidence"]
    ev_ids = [e["id"] for e in evidence_list]

    name_str = full_name.split("/")[-1] if "/" in full_name else full_name

    dossier = {
        "schema_version": "research-dossier-v1",
        "batch_id": batch_id_val,
        "record_status": "unknown",
        "observed_at": observed_at,
        "repository": {
            "platform": "github",
            "platform_repository_id": repo_id,
            "platform_node_id": repo.get("node_id") or None,
            "full_name": full_name,
            "canonical_url": f"https://github.com/{full_name}",
            "name_history": [],
            "default_branch": default_branch,
            "default_branch_oid": branch_oid,
            "visibility": repo.get("visibility", "public"),
            "is_fork": repo.get("fork", False),
            "fork_parent_repository_id": str(repo["parent"]["id"]) if repo.get("parent") else None,
            "mirror_url": repo.get("mirror_url") or None,
            "archived": repo.get("archived", False),
            "disabled": repo.get("disabled", False),
            "created_at": repo.get("created_at"),
            "updated_at": repo.get("updated_at"),
            "pushed_at": repo.get("pushed_at"),
        },
        "localized_content": {
            "name": {"zh-CN": name_str, "en": name_str},
            "summary": {"zh-CN": description or "待 LLM 补充", "en": description or "TBD by LLM"},
            "use_when": {"zh-CN": ["待 LLM 补充"], "en": ["TBD by LLM"]},
            "avoid_when": {"zh-CN": ["待 LLM 补充"], "en": ["TBD by LLM"]},
        },
        "classification": {"domain_ids": [], "subdomain_ids": [], "task_ids": [],
                           "capability_ids": [], "project_types": []},
        "technology": {"programming_languages": [], "frameworks": [], "runtimes": [],
                       "protocols": [], "data_types": []},
        "delivery": {"modes": [], "package_formats": [], "orchestrators": []},
        "platforms": {"operating_systems": [], "execution_targets": [],
                      "cpu_architectures": [], "accelerators": []},
        "natural_language_support": {
            "zh-CN": {"ui": "unknown", "docs": "unknown", "community": "unknown"},
            "en": {"ui": "unknown", "docs": "unknown", "community": "unknown"},
        },
        "licensing": {
            "openness": openness,
            "current_expression": spdx_id or "unknown",
            "version_rules": [],
            "additional_terms": [],
            "obligations_source": "not-provided-by-worker",
        },
        "releases": [],
        "lifecycle": {
            "status": "unknown",
            "latest_activity_at": repo.get("pushed_at") or None,
            "maintenance_model": "unknown",
        },
        "security": {
            "security_policy": "present" if any(
                e.get("source_type") == "security_policy" for e in evidence_list
            ) else "unknown",
            "advisory_source": "github",
            "supported_versions_known": False,
        },
        "quality": {"maturity": "unknown", "production_claim": "unknown", "known_limitations": []},
        "relations": [],
        "evidence": evidence_list,
        "field_states": {},
        "worker_notes": [
            "evidence-only dossier — summaries, classification, language support pending LLM phase",
        ],
    }

    # Verified fields (from GitHub API — authoritative)
    verified = [
        "repository.platform_repository_id", "repository.full_name",
        "repository.canonical_url", "repository.default_branch",
        "repository.visibility", "repository.is_fork",
        "repository.archived", "repository.disabled",
        "repository.created_at", "repository.updated_at", "repository.pushed_at",
    ]
    for field in verified:
        dossier["field_states"][field] = {"state": "verified", "evidence_ids": ev_ids[:1]}

    # Unknown fields (needs LLM/human)
    unknown_fields = [
        "localized_content.name", "localized_content.summary",
        "localized_content.use_when", "localized_content.avoid_when",
        "classification.domain_ids", "classification.subdomain_ids",
        "classification.task_ids", "classification.capability_ids",
        "classification.project_types",
        "technology.programming_languages", "technology.frameworks",
        "technology.runtimes", "technology.protocols", "technology.data_types",
        "delivery.modes", "delivery.package_formats", "delivery.orchestrators",
        "platforms.operating_systems", "platforms.execution_targets",
        "platforms.cpu_architectures", "platforms.accelerators",
        "natural_language_support.zh-CN.ui", "natural_language_support.zh-CN.docs",
        "natural_language_support.zh-CN.community",
        "natural_language_support.en.ui", "natural_language_support.en.docs",
        "natural_language_support.en.community",
        "licensing.version_rules", "licensing.additional_terms",
        "lifecycle.status", "lifecycle.maintenance_model",
        "quality.maturity", "quality.production_claim", "quality.known_limitations",
        "relations",
    ]
    for field in unknown_fields:
        dossier["field_states"][field] = EMPTY_FS

    return dossier


def _get_path(payload: dict[str, Any], path: str) -> Any:
    value: Any = payload
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _set_path(payload: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current = payload
    for part in parts[:-1]:
        current = current.setdefault(part, {})
    current[parts[-1]] = value


def _refresh_record_status(dossier: dict[str, Any]) -> None:
    states = [state.get("state") for state in dossier["field_states"].values()]
    if "conflicting" in states:
        dossier["record_status"] = "conflicting"
    elif any(state in {"unknown", "stale"} for state in states):
        dossier["record_status"] = "unknown"
    else:
        dossier["record_status"] = "complete"


def _build_dossier_v2(collected: dict[str, Any], batch_id_val: str,
                      observed_at: str) -> dict[str, Any]:
    """Build a schema-complete dossier whose unknowns are explicit."""
    repo = collected["repo"]
    repo_id = str(repo["id"])
    full_name = repo["full_name"]
    api_id = f"ev-{repo_id}-api"
    page_id = f"ev-{repo_id}-page"
    branch_id = f"ev-{repo_id}-branch"
    license_id = f"ev-{repo_id}-license"
    security_id = f"ev-{repo_id}-security"
    evidence_ids = {item["id"] for item in collected["evidence"]}
    description = (repo.get("description") or "").strip()
    license_expression = collected.get("license_expression")
    has_license = bool(license_expression and license_expression not in {"NOASSERTION", "unknown"})
    security_present = bool(collected.get("security_present"))

    dossier: dict[str, Any] = {
        "schema_version": "research-dossier-v1",
        "batch_id": batch_id_val,
        "record_status": "unknown",
        "observed_at": observed_at,
        "repository": {
            "platform": "github",
            "platform_repository_id": repo_id,
            "platform_node_id": repo.get("node_id"),
            "full_name": full_name,
            "canonical_url": repo.get("html_url") or f"https://github.com/{full_name}",
            "name_history": [],
            "default_branch": repo.get("default_branch") or "main",
            "default_branch_oid": collected.get("branch_oid"),
            "visibility": repo.get("visibility") or "public",
            "is_fork": bool(repo.get("fork", False)),
            "fork_parent_repository_id": (
                str(repo["parent"]["id"]) if isinstance(repo.get("parent"), dict) else None
            ),
            "mirror_url": repo.get("mirror_url") or None,
            "archived": bool(repo.get("archived", False)),
            "disabled": bool(repo.get("disabled", False)),
            "created_at": repo.get("created_at"),
            "updated_at": repo.get("updated_at"),
            "pushed_at": repo.get("pushed_at"),
        },
        "localized_content": {
            "name": {"zh-CN": full_name.rsplit("/", 1)[-1], "en": full_name.rsplit("/", 1)[-1]},
            "summary": {"zh-CN": description or "unknown", "en": description or "unknown"},
            "use_when": {"zh-CN": [], "en": []},
            "avoid_when": {"zh-CN": [], "en": []},
        },
        "classification": {
            "domain_ids": [], "subdomain_ids": [], "task_ids": [],
            "capability_ids": [], "project_types": [],
        },
        "technology": {
            "programming_languages": [], "frameworks": [], "runtimes": [],
            "protocols": [], "data_types": [],
        },
        "delivery": {"modes": [], "package_formats": [], "orchestrators": []},
        "platforms": {
            "operating_systems": [], "execution_targets": [],
            "cpu_architectures": [], "accelerators": [],
        },
        "natural_language_support": {
            "zh-CN": {"ui": "unknown", "docs": "unknown", "community": "unknown"},
            "en": {"ui": "unknown", "docs": "unknown", "community": "unknown"},
        },
        "licensing": {
            "openness": "open-source" if has_license else "unknown",
            "current_expression": license_expression if has_license else "unknown",
            "version_rules": [], "additional_terms": [],
            "obligations_source": "not-provided-by-worker",
        },
        "releases": [],
        "lifecycle": {
            "status": "archived" if repo.get("archived") else "unknown",
            "latest_activity_at": repo.get("pushed_at"),
            "maintenance_model": "unknown",
        },
        "security": {
            "security_policy": "present" if security_present else "absent",
            "advisory_source": "github",
            "supported_versions_known": False,
        },
        "quality": {"maturity": "unknown", "production_claim": "unknown", "known_limitations": []},
        "relations": [],
        "evidence": collected["evidence"],
        "field_states": {path: {"state": "unknown", "evidence_ids": []} for path in _required_paths()},
        "worker_notes": [
            "Public-evidence dossier enriched by the configured DeepSeek model; unknown fields remain explicit."
        ],
    }

    def mark(path: str, state: str, evidence_id: str | None) -> None:
        if evidence_id and evidence_id in evidence_ids:
            dossier["field_states"][path] = {"state": state, "evidence_ids": [evidence_id]}

    api_values = dossier["repository"]
    for path in REPOSITORY_API_PATHS:
        value = _get_path(dossier, path)
        if value is not None and value != "unknown":
            mark(path, "verified", api_id)
    for path in ("repository.fork_parent_repository_id", "repository.mirror_url"):
        mark(path, "verified", api_id)
    if dossier["repository"]["default_branch_oid"]:
        mark("repository.default_branch_oid", "verified", branch_id)
    mark("localized_content.name", "verified", page_id)
    if description:
        mark("localized_content.summary", "verified", page_id)
    if has_license:
        mark("licensing.openness", "verified", license_id)
        mark("licensing.current_expression", "verified", license_id)
    mark("security.security_policy", "verified", security_id)
    mark("security.advisory_source", "verified", security_id)
    mark("security.supported_versions_known", "verified", security_id)
    if repo.get("pushed_at"):
        mark("lifecycle.latest_activity_at", "verified", api_id)
    if repo.get("archived"):
        mark("lifecycle.status", "verified", api_id)
    _refresh_record_status(dossier)
    return dossier


def _required_paths() -> list[str]:
    taxonomy_path = ROOT / "schema/research-taxonomy-v1.json"
    return json.loads(taxonomy_path.read_text(encoding="utf-8"))["required_field_state_paths"]


def _deepseek_prompt(dossier: dict[str, Any]) -> str:
    repo = dossier["repository"]
    evidence = "\n\n".join(
        f"[{item['source_type']}] {item['url']}\n{item.get('fact', '')[:5000]}"
        for item in dossier["evidence"]
        if item.get("source_type") in {"documentation", "readme", "repository_api"}
    )
    return f"""根据以下公开证据，补充开源项目的检索字段。只填写证据明确支持的内容；不能确定的数组留空、枚举写 unknown。不得填写许可证义务、版本支持结论或 relations。

项目：{repo['full_name']}
当前摘要：{dossier['localized_content']['summary']['en']}

证据：
{evidence[:14000]}

只返回 JSON，键必须是：
{{
  "name_zh": "",
  "summary_zh": "",
  "summary_en": "",
  "use_when_zh": [], "use_when_en": [],
  "avoid_when_zh": [], "avoid_when_en": [],
  "domain_ids": [], "subdomain_ids": [], "task_ids": [],
  "capability_ids": [], "project_types": [],
  "programming_languages": [], "frameworks": [], "runtimes": [],
  "protocols": [], "data_types": [],
  "delivery_modes": [], "package_formats": [], "orchestrators": [],
  "operating_systems": [], "execution_targets": [],
  "cpu_architectures": [], "accelerators": [],
  "zh_ui": "unknown", "zh_docs": "unknown", "zh_community": "unknown",
  "en_ui": "unknown", "en_docs": "unknown", "en_community": "unknown",
  "lifecycle_status": "unknown", "maintenance_model": "unknown",
  "maturity": "unknown", "production_claim": "unknown",
  "known_limitations": [], "confidence": 0.0, "notes": ""
}}"""


def _merge_deepseek(dossier: dict[str, Any], result: dict[str, Any]) -> None:
    """Apply only taxonomy-controlled, evidence-backed model fields."""
    taxonomy = json.loads(
        (ROOT / "schema/research-taxonomy-v1.json").read_text(encoding="utf-8")
    )
    evidence_by_path: dict[str, str] = {}
    for item in sorted(
        dossier["evidence"],
        key=lambda item: 0 if item.get("source_type") == "readme" else 1,
    ):
        if item.get("source_type") not in {"documentation", "readme"}:
            continue
        for path in item.get("applies_to", []):
            evidence_by_path.setdefault(path, item["id"])

    def evidence_for(path: str) -> str | None:
        return evidence_by_path.get(path)

    def list_value(key: str) -> list[str]:
        allowed = set(taxonomy.get(key, []))
        value = result.get(key, [])
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str) and item in allowed]

    def apply(path: str, value: Any) -> None:
        evidence_id = evidence_for(path)
        if evidence_id is None:
            return
        if isinstance(value, str) and not value.strip():
            return
        if isinstance(value, list) and not value:
            return
        _set_path(dossier, path, value)
        dossier["field_states"][path] = {
            "state": "inferred",
            "evidence_ids": [evidence_id],
        }

    name_zh = result.get("name_zh")
    if isinstance(name_zh, str) and name_zh.strip() and evidence_for("localized_content.name"):
        dossier["localized_content"]["name"]["zh-CN"] = name_zh.strip()[:200]
        dossier["field_states"]["localized_content.name"] = {
            "state": "inferred",
            "evidence_ids": [evidence_for("localized_content.name")],
        }

    for key, language in (("summary_zh", "zh-CN"), ("summary_en", "en")):
        value = result.get(key)
        if isinstance(value, str) and value.strip() and evidence_for("localized_content.summary"):
            dossier["localized_content"]["summary"][language] = value.strip()[:1000]
            dossier["field_states"]["localized_content.summary"] = {
                "state": "inferred",
                "evidence_ids": [evidence_for("localized_content.summary")],
            }

    for key, path, language in (
        ("use_when_zh", "localized_content.use_when", "zh-CN"),
        ("use_when_en", "localized_content.use_when", "en"),
        ("avoid_when_zh", "localized_content.avoid_when", "zh-CN"),
        ("avoid_when_en", "localized_content.avoid_when", "en"),
    ):
        value = result.get(key)
        if isinstance(value, list):
            cleaned = [item.strip()[:300] for item in value if isinstance(item, str) and item.strip()]
            if cleaned and evidence_for(path):
                target = "use_when" if key.startswith("use") else "avoid_when"
                dossier["localized_content"][target][language] = cleaned[:8]
                dossier["field_states"][path] = {
                    "state": "inferred",
                    "evidence_ids": [evidence_for(path)],
                }

    list_mappings = {
        "domain_ids": "classification.domain_ids",
        "subdomain_ids": "classification.subdomain_ids",
        "task_ids": "classification.task_ids",
        "capability_ids": "classification.capability_ids",
        "project_types": "classification.project_types",
        "programming_languages": "technology.programming_languages",
        "frameworks": "technology.frameworks",
        "runtimes": "technology.runtimes",
        "protocols": "technology.protocols",
        "data_types": "technology.data_types",
        "delivery_modes": "delivery.modes",
        "package_formats": "delivery.package_formats",
        "orchestrators": "delivery.orchestrators",
        "operating_systems": "platforms.operating_systems",
        "execution_targets": "platforms.execution_targets",
        "cpu_architectures": "platforms.cpu_architectures",
        "accelerators": "platforms.accelerators",
    }
    for key, path in list_mappings.items():
        value = list_value(key)
        if key == "subdomain_ids":
            domains = set(list_value("domain_ids"))
            value = [item for item in value if item.split(":", 1)[0] in domains]
        if value:
            apply(path, value)

    support_values = {"full", "partial", "none", "unknown"}
    for key, path in (
        ("zh_ui", "natural_language_support.zh-CN.ui"),
        ("zh_docs", "natural_language_support.zh-CN.docs"),
        ("zh_community", "natural_language_support.zh-CN.community"),
        ("en_ui", "natural_language_support.en.ui"),
        ("en_docs", "natural_language_support.en.docs"),
        ("en_community", "natural_language_support.en.community"),
    ):
        value = result.get(key)
        if value in support_values and value != "unknown":
            apply(path, value)

    for key, path, allowed in (
        ("lifecycle_status", "lifecycle.status", {"active", "maintenance", "inactive", "archived", "unknown"}),
        ("maintenance_model", "lifecycle.maintenance_model", set(taxonomy.get("maintenance_models", []))),
        ("maturity", "quality.maturity", {"experimental", "early", "stable", "mature", "unknown"}),
        ("production_claim", "quality.production_claim", set(taxonomy.get("production_claims", []))),
    ):
        value = result.get(key)
        if path == "lifecycle.status" and dossier["lifecycle"]["status"] != "unknown":
            continue
        if isinstance(value, str) and value in allowed and value != "unknown":
            apply(path, value)
    limitations = result.get("known_limitations")
    if isinstance(limitations, list):
        cleaned = [item.strip()[:500] for item in limitations if isinstance(item, str) and item.strip()]
        if cleaned:
            apply("quality.known_limitations", cleaned[:12])

    try:
        confidence = float(result.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    dossier["worker_notes"].append(
        f"DeepSeek model={os.environ.get('DEEPSEEK_MODEL', 'deepseek-v4-pro')} "
        f"confidence={confidence:.2f}; notes={str(result.get('notes', ''))[:500]}"
    )
    _refresh_record_status(dossier)


# ─── Git Database API writes ────────────────────────────────────────────

def _create_blob(content: str) -> str:
    data = _gh_post(_api_path("/git/blobs"), {"content": content, "encoding": "utf-8"})
    return data["sha"]


def _create_tree(base_sha: str, files: list[dict[str, Any]]) -> str:
    items = [{"path": f["path"], "mode": "100644", "type": "blob", "sha": f["sha"]}
             for f in files]
    data = _gh_post(_api_path("/git/trees"), {"base_tree": base_sha, "tree": items})
    return data["sha"]


def _create_commit(tree_sha: str, parent_sha: str, message: str) -> str:
    data = _gh_post(_api_path("/git/commits"), {
        "message": message, "tree": tree_sha, "parents": [parent_sha],
    })
    return data["sha"]


def _update_ref(branch: str, commit_sha: str) -> None:
    """Create or update a branch ref."""
    ref_path = f"refs/heads/{branch}"
    existing_sha = _get_branch_sha(branch)
    if existing_sha:
        _gh_patch(_api_path(f"/git/{ref_path}"), {"sha": commit_sha, "force": False})
    else:
        _gh_post(_api_path("/git/refs"), {"ref": ref_path, "sha": commit_sha})


def _create_or_update_pr(branch: str, title: str) -> dict[str, Any]:
    existing = _find_research_pr()
    if existing:
        return existing
    data = _gh_post(f"/repos/{GITHUB_REPO}/pulls", {
        "title": title, "head": branch, "base": "main",
        "body": "Continuous research accumulation. Automated by research-worker.\n\n"
                "Each commit adds one batch: JSONL + manifest. "
                "Validated by `research-boundary` CI.",
    })
    return data


def _research_boundary_passed(branch: str, head_sha: str) -> bool:
    """Do not append a second batch before the exact previous head is trusted."""
    runs = _gh_get(
        f"/repos/{GITHUB_REPO}/actions/workflows/research-boundary.yml/runs"
        f"?event=pull_request_target&status=completed&per_page=100"
    )
    return any(
        run.get("conclusion") == "success"
        and run.get("head_sha") == head_sha
        and run.get("head_branch") == branch
        for run in runs.get("workflow_runs", [])
    )


# ─── main worker loop ───────────────────────────────────────────────────

def _require_actions_runtime() -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true" and os.environ.get("RESEARCH_WORKER_ALLOW_LOCAL") != "1":
        raise RuntimeError(
            "research worker is cloud-only; run it in GitHub Actions, not on a local workstation"
        )
    _deepseek_settings()


def run_full_batch(batch_size: int | None = None) -> None:
    _require_actions_runtime()
    config = _load_config()
    if batch_size is None:
        batch_size = config["batch"]["current_repositories"]

    # ── discover state ──
    print("=== discovering state ===")
    main_sha = _get_main_sha()
    print(f"main HEAD: {main_sha}")

    pr = _find_research_pr()
    branch = _date_branch()

    if pr:
        branch = pr["head"]["ref"]
        branch_sha = _get_branch_sha(branch)
        current_sha = branch_sha or main_sha
        print(f"existing PR: #{pr['number']}, branch={branch}, head={current_sha}")
        if branch_sha and not _research_boundary_passed(branch, branch_sha):
            print("previous research-boundary check is not successful; waiting before next batch")
            return
    else:
        print(f"no existing research PR, will use branch {branch}")

    # ── determine cursor ──
    since = config["enumeration"]["initial_since"]

    if pr:
        branch_sha = _get_branch_sha(branch)
        if branch_sha:
            cursor = _read_manifest_cursor(branch_sha)
            if cursor:
                since = cursor
                print(f"resuming from manifest cursor: {since}")
    elif branch_sha := _get_branch_sha(branch):
        cursor = _read_manifest_cursor(branch_sha)
        if cursor:
            since = cursor

    print(f"enumeration since: {since}")

    # ── enumerate ──
    print(f"\n=== enumerating (since={since}) ===")
    repos = _enumerate_repos(since)
    print(f"API returned {len(repos)} repos")

    batch_repos = repos[:batch_size]
    if not batch_repos:
        print("empty page — caught up with public enumeration queue")
        return

    first_id = str(batch_repos[0]["id"])
    last_id = str(batch_repos[-1]["id"])
    batch_id_val = _batch_id(since, first_id)
    observed_at = _now_iso()
    print(f"\n=== batch {batch_id_val}: {len(batch_repos)} repos (IDs {first_id}..{last_id}) ===")

    # ── collect evidence ──
    dossiers = []
    failures = []
    for repo in batch_repos:
        rid = str(repo["id"])
        name = repo.get("full_name", repo.get("name", "unknown"))
        print(f"\n[{rid}] {name}")
        try:
            collected = _collect_evidence_v2(repo)
            dossier = _build_dossier_v2(collected, batch_id_val, observed_at)
            _merge_deepseek(dossier, _deepseek_json(_deepseek_prompt(dossier)))
            dossiers.append(dossier)
            print(
                f"  evidence_items={len(collected['evidence'])}, "
                f"branch_oid={'yes' if collected.get('branch_oid') else 'no'}, "
                f"record_status={dossier['record_status']}"
            )
        except Exception as exc:
            print(f"  FAILED: {exc}")
            failures.append({
                "repository_id": rid,
                "reason": "http-error" if isinstance(exc, (HTTPError, URLError)) else "repository-unavailable",
                "retry_after": _now_iso(),
                "attempts": 1,
            })

    if not dossiers:
        print("no dossiers produced — all repos failed")
        return

    # ── write temporary files for validation ──
    jsonl_path = Path(f"data/quarantine/research/{batch_id_val}.jsonl")
    manifest_path = Path(f"data/quarantine/research/{batch_id_val}.manifest.json")
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)

    jsonl_content = "\n".join(json.dumps(d, ensure_ascii=False) for d in dossiers) + "\n"
    jsonl_path.write_text(jsonl_content, encoding="utf-8")

    next_since = str(int(last_id))
    manifest = {
        "schema_version": "research-batch-manifest-v1",
        "batch_id": batch_id_val,
        "created_at": observed_at,
        "input": {
            "source": "github-public-repositories",
            "since": since,
            "repository_ids": [str(repo["id"]) for repo in batch_repos],
            "first_repository_id": first_id,
            "last_repository_id": last_id,
        },
        "counts": {
            "total": len(batch_repos),
            "complete": sum(d["record_status"] == "complete" for d in dossiers),
            "unknown": sum(d["record_status"] == "unknown" for d in dossiers),
            "conflicting": sum(d["record_status"] == "conflicting" for d in dossiers),
            "failed": len(failures),
            "skipped": 0,
        },
        "artifact": {
            "path": jsonl_path.as_posix(),
            "bytes": len(jsonl_content.encode("utf-8")),
            "sha256": _sha256_text(jsonl_content),
        },
        "rate_limit": _rate_limit_snapshot(),
        "next_since": next_since,
        "failures": failures,
        "worker": {
            "model_role": "deepseek-data-worker",
            "program_version": WORKER_VERSION,
            "run_id": str(uuid.uuid4()),
        },
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ── Git Database API: commit and push ──
    print(f"\n=== committing via Git Database API ===")

    if pr:
        base_sha = _get_branch_sha(branch) or main_sha
    else:
        base_sha = main_sha

    jsonl_blob = _create_blob(jsonl_content)
    manifest_blob = _create_blob(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"  blobs: jsonl={jsonl_blob[:8]} manifest={manifest_blob[:8]}")

    base_commit = _gh_get(_api_path(f"/git/commits/{base_sha}"))
    base_tree_sha = base_commit["tree"]["sha"]
    new_tree = _create_tree(base_tree_sha, [
        {"path": str(jsonl_path), "sha": jsonl_blob},
        {"path": str(manifest_path), "sha": manifest_blob},
    ])
    print(f"  tree: {new_tree[:8]}")

    commit_msg = f"data: research batch {batch_id_val}"
    commit_sha = _create_commit(new_tree, base_sha, commit_msg)
    print(f"  commit: {commit_sha}")

    _update_ref(branch, commit_sha)
    print(f"  ref updated: refs/heads/{branch}")

    pr = _create_or_update_pr(branch, "data: research accumulation")
    print(f"  PR: #{pr.get('number', 'new')}")

    print(f"\n=== batch {batch_id_val} complete ===\n"
          f"  dossiers: {len(dossiers)}  failures: {len(failures)}  "
          f"next_since: {next_since}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", default="full-batch",
                        choices=["full-batch", "enumerate-only", "retry-failures"])
    parser.add_argument("--batch-size", type=int)
    args = parser.parse_args()

    if args.mode == "full-batch":
        run_full_batch(args.batch_size)
    elif args.mode == "enumerate-only":
        config = _load_config()
        since = config["enumeration"]["initial_since"]
        repos = _enumerate_repos(since)
        print(f"{len(repos)} repos from since={since}")
        for r in repos[:10]:
            print(f"  {r['id']}: {r['full_name']}")
    elif args.mode == "retry-failures":
        print("retry-failures mode: not yet implemented")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
