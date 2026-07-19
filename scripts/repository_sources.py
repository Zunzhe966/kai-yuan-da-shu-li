from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml


REQUIRED_FIELDS = {"name", "url", "visibility", "revision", "content_path"}


def load_sources(path: Path) -> list[dict[str, Any]]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("version") != 1:
        raise ValueError("sources manifest must use version 1")
    sources = payload.get("sources")
    if not isinstance(sources, list):
        raise ValueError("sources manifest must contain a sources list")
    return sources


def validate_sources(items: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for index, item in enumerate(items):
        prefix = f"source[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: source must be an object")
            continue
        missing = sorted(REQUIRED_FIELDS - set(item))
        if missing:
            errors.append(f"{prefix}: missing fields: {', '.join(missing)}")
            continue
        name = str(item["name"])
        if name in seen:
            errors.append(f"{prefix}: duplicate source name: {name}")
        seen.add(name)
        if item["visibility"] != "public":
            errors.append(f"{prefix}: private visibility is not allowed")
        parsed = urlparse(str(item["url"]))
        if parsed.scheme != "https" or not parsed.netloc:
            errors.append(f"{prefix}: url must be HTTPS")
        revision = str(item["revision"])
        if len(revision) != 40 or any(char not in "0123456789abcdef" for char in revision):
            errors.append(f"{prefix}: revision must be a 40-character commit SHA")
        if not str(item["content_path"]).strip():
            errors.append(f"{prefix}: content_path must not be empty")
    return errors
