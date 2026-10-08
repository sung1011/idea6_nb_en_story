"""Build English word timings from edge-tts WordBoundary events."""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import edge_tts

WORD_RE = re.compile(r"[A-Za-z0-9']+")
DURATION_TOLERANCE_MS = 120


def speak_words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def mp3_duration_ms(path: Path) -> float | None:
    ffmpeg = shutil.which("ffprobe")
    if not ffmpeg or not path.exists():
        return None
    result = subprocess.run(
        [
            ffmpeg,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip()) * 1000
    except ValueError:
        return None


def shrink(src: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return
    tmp = src.with_suffix(".tmp.mp3")
    result = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(src),
            "-ac",
            "1",
            "-ar",
            "24000",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "40k",
            str(tmp),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if result.returncode != 0 or not tmp.exists():
        tmp.unlink(missing_ok=True)
        return
    if tmp.stat().st_size < src.stat().st_size:
        tmp.replace(src)
    else:
        tmp.unlink()


def map_boundaries(text: str, events: list[tuple[int, int, str]]) -> list[list[int]]:
    words = speak_words(text)
    cursor = 0
    mapped: list[list[int]] = []
    for start, end, raw in events:
        token = WORD_RE.findall(raw)
        needle = token[0].lower() if token else re.sub(r"[^a-z0-9']", "", raw.lower())
        idx = None
        if needle:
            for j in range(cursor, len(words)):
                if words[j].lower() == needle:
                    idx = j
                    cursor = j + 1
                    break
        if idx is None:
            idx = min(cursor, max(len(words) - 1, 0))
            cursor = idx + 1
        mapped.append([start, end, idx])
    return mapped


async def synthesize_with_cues(text: str, voice: str, rate: str) -> tuple[bytes, list[tuple[int, int, str]]]:
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    audio = b""
    events: list[tuple[int, int, str]] = []
    async for chunk in communicate.stream():
        kind = chunk.get("type")
        if kind == "audio":
            audio += chunk["data"]
        elif kind == "WordBoundary":
            start_ms = int(round(chunk["offset"] / 10_000))
            end_ms = int(round((chunk["offset"] + chunk["duration"]) / 10_000))
            events.append((start_ms, end_ms, str(chunk.get("text") or "")))
    return audio, events


async def main() -> int:
    public_dir = Path(sys.argv[1])
    catalog = json.load(sys.stdin)
    clips = [clip for clip in catalog["clips"] if clip.get("lang") == "en"]
    sem = asyncio.Semaphore(3)
    replaced = 0
    kept = 0
    failed: list[str] = []
    by_story: dict[str, dict[str, list[list[int]]]] = {}

    async def one(clip: dict) -> None:
        nonlocal replaced, kept
        dest = public_dir / clip["file"]
        story_id = clip["storyId"]
        page_id = clip["pageId"]
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            async with sem:
                last = ""
                for attempt in range(3):
                    try:
                        audio, events = await synthesize_with_cues(clip["text"], clip["voice"], clip["rate"])
                        if not audio:
                            raise RuntimeError("empty audio")
                        tmp = dest.with_suffix(".gen.mp3")
                        tmp.write_bytes(audio)
                        shrink(tmp)
                        new_ms = mp3_duration_ms(tmp)
                        old_ms = mp3_duration_ms(dest)
                        if (
                            dest.exists()
                            and old_ms is not None
                            and new_ms is not None
                            and abs(new_ms - old_ms) <= DURATION_TOLERANCE_MS
                        ):
                            tmp.unlink(missing_ok=True)
                            kept += 1
                        else:
                            tmp.replace(dest)
                            replaced += 1
                        by_story.setdefault(story_id, {})[page_id] = map_boundaries(clip["text"], events)
                        return
                    except Exception as error:  # noqa: BLE001
                        last = str(error)
                        dest.with_suffix(".gen.mp3").unlink(missing_ok=True)
                        await asyncio.sleep(0.8 * (attempt + 1))
                failed.append(f"{clip['file']}: {last}")
        finally:
            done = kept + replaced + len(failed)
            if done % 5 == 0 or done == len(clips):
                print(
                    f"timings {done}/{len(clips)} kept {kept} replaced {replaced}",
                    flush=True,
                )

    await asyncio.gather(*(one(clip) for clip in clips))
    for story_id, pages in by_story.items():
        out = public_dir / "audio" / story_id / "timings.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(pages, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"wrote {out} pages {len(pages)}")
    print(f"en timings done kept {kept} replaced {replaced}")
    if failed:
        print(f"FAILED {len(failed)}")
        for line in failed[:20]:
            print(line)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
