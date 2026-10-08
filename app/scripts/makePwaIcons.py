#!/usr/bin/env python3
"""Generate public PWA/favicon PNGs from app/assets/icon-master.png."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "assets" / "icon-master.png"
PUBLIC = ROOT / "public"

SIZES = (
    ("pwa512.png", 512),
    ("pwa192.png", 192),
    ("appleTouchIcon.png", 180),
    ("favicon.png", 48),
)


def compress(path: Path) -> None:
    if shutil.which("pngquant"):
        tmp = path.with_suffix(".quant.png")
        subprocess.run(
            [
                "pngquant",
                "--quality=90-100",
                "--speed",
                "1",
                "--force",
                "--output",
                str(tmp),
                "--",
                str(path),
            ],
            check=True,
        )
        tmp.replace(path)
    if shutil.which("optipng"):
        subprocess.run(
            ["optipng", "-o7", "-strip", "all", "-quiet", str(path)],
            check=False,
        )


def main() -> None:
    if not MASTER.is_file():
        raise SystemExit(f"missing master icon: {MASTER}")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER).convert("RGB")
    for name, size in SIZES:
        path = PUBLIC / name
        master.resize((size, size), Image.Resampling.LANCZOS).save(
            path,
            format="PNG",
            optimize=True,
            compress_level=9,
        )
        compress(path)
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
