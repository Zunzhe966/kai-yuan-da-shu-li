from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import re
import subprocess
import tarfile
from pathlib import Path


RELEASE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def _release_files(site: Path) -> list[tuple[Path, Path]]:
    root = site.resolve(strict=True)
    files: list[tuple[Path, Path]] = []
    for path in sorted(site.rglob("*"), key=lambda item: item.as_posix()):
        if path.is_symlink():
            raise ValueError(f"release source contains symlink: {path}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f"release source is not a regular file: {path}")
        resolved = path.resolve(strict=True)
        try:
            relative = resolved.relative_to(root)
        except ValueError as error:
            raise ValueError(f"release source escapes site root: {path}") from error
        files.append((resolved, relative))
    return files


def build_release(site: Path, output: Path, release_name: str) -> dict:
    if not RELEASE_NAME.fullmatch(release_name):
        raise ValueError("release name must contain only letters, numbers, dot, dash, or underscore")
    files = _release_files(site)
    output.mkdir(parents=True, exist_ok=True)
    archive_path = output / f"{release_name}.tar.gz"

    with archive_path.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for source, relative in files:
                    payload = source.read_bytes()
                    info = tarfile.TarInfo(relative.as_posix())
                    info.size = len(payload)
                    info.mode = 0o644
                    info.mtime = 0
                    info.uid = 0
                    info.gid = 0
                    info.uname = ""
                    info.gname = ""
                    archive.addfile(info, io.BytesIO(payload))

    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    manifest = {
        "release_name": release_name,
        "file_count": len(files),
        "uncompressed_bytes": sum(source.stat().st_size for source, _ in files),
        "archive_bytes": archive_path.stat().st_size,
        "sha256": digest,
    }
    (output / f"{release_name}.manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def _default_release_name() -> str:
    return subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, default=Path("build/site"))
    parser.add_argument("--output", type=Path, default=Path("build/releases"))
    parser.add_argument("--release-name")
    args = parser.parse_args()
    release_name = args.release_name or _default_release_name()
    manifest = build_release(args.site, args.output, release_name)
    print(
        f"release {release_name}: {manifest['file_count']} files, "
        f"{manifest['archive_bytes']} bytes, sha256={manifest['sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
