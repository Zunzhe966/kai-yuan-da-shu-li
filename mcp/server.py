#!/usr/bin/env python3
"""Local MCP server for 开源大梳理 (kaiyuan-dashuli)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from mcp.server.fastmcp import FastMCP

from atlas_lib import get_alternatives, get_node, search_projects

mcp = FastMCP(
    name="kaiyuan-dashuli",
    instructions=(
        "开源大梳理：Agent-first open-source atlas. "
        "Prefer search_projects / get_alternatives / get_node before raw GitHub keyword search."
    ),
    website_url="https://github.com/Zunzhe966/kaiyuan-dashuli",
)


@mcp.tool(name="search_projects")
def search_projects_tool(
    query: str,
    tags: list[str] | None = None,
    domain: str = "all",
    limit: int = 3,
) -> dict:
    """Search curated open-source projects in the atlas. domain=all searches every domain."""
    limit = max(1, min(int(limit), 5))
    d = None if domain in ("all", "", "*") else domain
    return {"results": search_projects(query=query, tags=tags, domain=d, limit=limit)}


@mcp.tool(name="get_alternatives")
def get_alternatives_tool(id: str, limit: int = 5) -> dict:
    """List alternative/superseding projects for a node id."""
    limit = max(1, min(int(limit), 10))
    return {"results": get_alternatives(node_id=id, limit=limit)}


@mcp.tool(name="get_node")
def get_node_tool(id: str) -> dict:
    """Get one project node and its graph edges."""
    node = get_node(id)
    if not node:
        return {"error": f"unknown id: {id}"}
    return {"node": node}


if __name__ == "__main__":
    mcp.run()
