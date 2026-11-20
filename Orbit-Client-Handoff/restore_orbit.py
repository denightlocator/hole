#!/usr/bin/env python3
"""Restore the complete Orbit Client project from the handoff bundle.

Usage:
    python3 restore_orbit.py
    python3 restore_orbit.py --dest /some/folder
    python3 restore_orbit.py --list

Only Python's standard library is required. Existing project folders are never overwritten.
"""

import argparse
import hashlib
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import tempfile

PAYLOAD_NAME = "orbit-client-project.tar.xz"
PAYLOAD_SHA256 = "b983203909032ebac16ade48d51f0e06bd3e4f849b3cf0a501856e2bc0d47a31"
PROJECT_NAME = "orbit-client"
EXPECTED_FILES = 157


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_members(members):
    """Accept only distinct, ordinary project files with safe relative paths."""
    if len(members) != EXPECTED_FILES:
        raise ValueError(f"Expected {EXPECTED_FILES} project files, found {len(members)}")
    seen = set()
    for member in members:
        name = member.name
        path = PurePosixPath(name)
        if (not member.isfile() or path.is_absolute() or ".." in path.parts
                or "\\" in name or ":" in name or len(path.parts) < 2
                or path.parts[0] != PROJECT_NAME):
            raise ValueError(f"Unsafe or unsupported archive member: {name!r}")
        # Also prevent collisions on case-insensitive filesystems.
        key = name.casefold()
        if key in seen:
            raise ValueError(f"Duplicate archive path: {name!r}")
        seen.add(key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dest", type=Path, default=Path(__file__).resolve().parent,
                        help="Parent folder for orbit-client (default: beside this script)")
    parser.add_argument("--list", action="store_true",
                        help="List the files without restoring them")
    args = parser.parse_args()

    payload = Path(__file__).resolve().parent / PAYLOAD_NAME
    if not payload.is_file():
        raise SystemExit(f"Missing project bundle: {payload}")
    if sha256_file(payload) != PAYLOAD_SHA256:
        raise SystemExit("Project bundle checksum does not match; nothing was extracted.")

    with tarfile.open(payload, mode="r:xz") as archive:
        members = archive.getmembers()
        validate_members(members)
        if args.list:
            for member in sorted(members, key=lambda item: item.name):
                print(f"{member.name} ({member.size} bytes)")
            print(f"\n{len(members)} files; payload checksum verified.")
            return

        destination = args.dest.expanduser().resolve()
        destination.mkdir(parents=True, exist_ok=True)
        project = destination / PROJECT_NAME
        if project.exists() or project.is_symlink():
            raise SystemExit(f"Refusing to overwrite {project}. Choose another --dest folder.")

        # Extract into a fresh temporary folder, writing only validated regular files. Move the
        # finished project into place afterwards, so an interruption cannot replace existing work.
        with tempfile.TemporaryDirectory(prefix=".orbit-restore-", dir=destination) as temp:
            temp_root = Path(temp)
            for member in members:
                relative = Path(*PurePosixPath(member.name).parts)
                target = temp_root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                source = archive.extractfile(member)
                if source is None:
                    raise ValueError(f"Could not read {member.name}")
                with source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
                if os.name != "nt":
                    target.chmod(member.mode & 0o777)
            if project.exists() or project.is_symlink():
                raise SystemExit(f"Refusing to overwrite {project}.")
            (temp_root / PROJECT_NAME).rename(project)

    print(f"Restored {len(members)} source and asset files to: {project}")
    print("Read README.md there for building and usage.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, tarfile.TarError) as exc:
        print(f"Restore failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
