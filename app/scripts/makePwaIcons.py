#!/usr/bin/env python3
"""Generate compressed pastel PWA icons (192 / 512 / apple-touch)."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"

# Kid-friendly pastels aligned with the reader palette.
SAND = (243, 234, 216)
SKY = (214, 232, 228)
TEAL = (126, 200, 192)
TEAL_DEEP = (90, 168, 160)
CREAM = (255, 253, 247)
CORAL = (244, 168, 154)
CORAL_DEEP = (232, 140, 124)
STAR = (255, 226, 150)
INK = (80, 110, 104)


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: Path, width: int, height: int, rgb: list[tuple[int, int, int]]) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        row = y * width
        for x in range(width):
            raw.extend(rgb[row + x])
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    if edge1 == edge0:
        return 0.0 if x < edge0 else 1.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def sd_round_rect(px: float, py: float, cx: float, cy: float, hw: float, hh: float, radius: float) -> float:
    dx = abs(px - cx) - (hw - radius)
    dy = abs(py - cy) - (hh - radius)
    ox = max(dx, 0.0)
    oy = max(dy, 0.0)
    return math.hypot(ox, oy) + min(max(dx, dy), 0.0) - radius


def sd_circle(px: float, py: float, cx: float, cy: float, radius: float) -> float:
    return math.hypot(px - cx, py - cy) - radius


def sd_capsule(px: float, py: float, ax: float, ay: float, bx: float, by: float, radius: float) -> float:
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    ab2 = abx * abx + aby * aby
    t = 0.0 if ab2 == 0 else max(0.0, min(1.0, (apx * abx + apy * aby) / ab2))
    return math.hypot(px - (ax + abx * t), py - (ay + aby * t)) - radius


def point_in_quad(
    px: float,
    py: float,
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
) -> float:
    """Signed distance-ish to a convex quad via edge tests (positive outside)."""

    pts = (p0, p1, p2, p3)
    max_out = -1e9
    for i in range(4):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % 4]
        nx, ny = by - ay, ax - bx
        length = math.hypot(nx, ny) or 1.0
        nx, ny = nx / length, ny / length
        d = (px - ax) * nx + (py - ay) * ny
        if d > max_out:
            max_out = d
    return max_out


def sd_star(px: float, py: float, cx: float, cy: float, outer: float, inner: float, n: int = 5) -> float:
    dx, dy = px - cx, py - cy
    angle = math.atan2(dy, dx)
    dist = math.hypot(dx, dy)
    sector = math.pi / n
    a = (angle + math.pi / 2) % (2 * sector)
    if a > sector:
        a = 2 * sector - a
    t = a / sector
    radius = outer * (1.0 - t) + inner * t
    # Sharper star by mixing with a slightly tighter inner radius.
    radius = outer * (1.0 - t * t) + inner * (t * t)
    return dist - radius


def sample(px: float, py: float, size: float) -> tuple[int, int, int]:
    # Maskable-safe padding (~18%).
    pad = size * 0.18
    inner = size - pad * 2
    cx = cy = size * 0.5
    hw = hh = inner * 0.5

    color = mix(SAND, SKY, max(0.0, min(1.0, (py / size) * 0.55)))

    plate = sd_round_rect(px, py, cx, cy, hw, hh, inner * 0.22)
    color = mix(color, TEAL, smoothstep(1.2, -1.2, plate))
    rim = abs(plate) - size * 0.012
    color = mix(color, TEAL_DEEP, smoothstep(1.0, -0.4, rim) * 0.45)

    pole_x = cx - inner * 0.16
    pole = sd_capsule(
        px,
        py,
        pole_x,
        cy - inner * 0.28,
        pole_x,
        cy + inner * 0.30,
        inner * 0.035,
    )
    color = mix(color, CREAM, smoothstep(1.0, -0.8, pole))
    color = mix(color, INK, smoothstep(0.6, -0.2, abs(pole) - inner * 0.008) * 0.18)

    flag_left = pole_x + inner * 0.02
    flag_top = cy - inner * 0.27
    flag_h = inner * 0.28
    wave = math.sin((py - flag_top) / flag_h * math.pi) * inner * 0.03
    p0 = (flag_left, flag_top)
    p1 = (flag_left + inner * 0.46 + wave, flag_top + flag_h * 0.18)
    p2 = (flag_left + inner * 0.40 - wave * 0.4, flag_top + flag_h * 0.55)
    p3 = (flag_left, flag_top + flag_h)
    flag = point_in_quad(px, py, p0, p1, p2, p3)
    color = mix(color, CORAL, smoothstep(1.1, -0.9, flag))
    color = mix(color, CORAL_DEEP, smoothstep(1.1, -0.9, flag) * max(0.0, (py - flag_top) / flag_h * 0.35))

    star = sd_star(px, py, cx + inner * 0.22, cy + inner * 0.18, inner * 0.09, inner * 0.038)
    color = mix(color, STAR, smoothstep(1.0, -0.8, star))
    color = mix(color, CREAM, smoothstep(0.8, -0.4, sd_circle(px, py, cx + inner * 0.22, cy + inner * 0.18, inner * 0.025)))

    return color


def render(size: int) -> list[tuple[int, int, int]]:
    samples = 3
    step = 1.0 / samples
    pixels: list[tuple[int, int, int]] = []
    for y in range(size):
        for x in range(size):
            acc = [0.0, 0.0, 0.0]
            for oy in range(samples):
                for ox in range(samples):
                    px = x + (ox + 0.5) * step
                    py = y + (oy + 0.5) * step
                    r, g, b = sample(px, py, float(size))
                    acc[0] += r
                    acc[1] += g
                    acc[2] += b
            n = samples * samples
            pixels.append((int(acc[0] / n + 0.5), int(acc[1] / n + 0.5), int(acc[2] / n + 0.5)))
    return pixels


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for name, size in (("pwa192.png", 192), ("pwa512.png", 512), ("appleTouchIcon.png", 180)):
        path = PUBLIC / name
        write_png(path, size, size, render(size))
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
