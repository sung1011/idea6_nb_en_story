export type WordCue = [startMs: number, endMs: number, wordIndex: number]

export function followWordAt(cues: WordCue[], timeMs: number): number | null {
  if (!cues.length || !Number.isFinite(timeMs)) return null
  let found: number | null = null
  for (let i = 0; i < cues.length; i += 1) {
    const start = cues[i][0]
    if (timeMs < start) break
    found = cues[i][2]
  }
  return found
}

export function asWordCues(raw: unknown): WordCue[] {
  if (!Array.isArray(raw)) return []
  const cues: WordCue[] = []
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 3) continue
    const start = Number(item[0])
    const end = Number(item[1])
    const index = Number(item[2])
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(index)) continue
    cues.push([start, end, index])
  }
  return cues
}
