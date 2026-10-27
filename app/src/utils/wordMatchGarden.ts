import type { LearnItem, Story } from '@/types/story'

export const WORD_MATCH_PAIR_LIMIT = 6
export const WORD_MATCH_MIN_PAIRS = 2

export type GardenTileKind = 'word' | 'picture'

export interface GardenTile {
  id: string
  word: string
  kind: GardenTileKind
  image: string
}

export function collectWordCards(story: Story): LearnItem[] {
  const seen = new Set<string>()
  const items: LearnItem[] = []
  for (const page of story.pages || []) {
    for (const item of page.learnItems || []) {
      const word = String(item.word || '').trim()
      const image = String(item.image || '').trim()
      if (!word || !image) continue
      const key = word.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ word, gloss: item.gloss, image })
    }
  }
  return items
}

export function shuffleList<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = next[i]
    const b = next[j]
    if (a === undefined || b === undefined) continue
    next[i] = b
    next[j] = a
  }
  return next
}

export function pickWordCards(items: LearnItem[], limit = WORD_MATCH_PAIR_LIMIT): LearnItem[] {
  return shuffleList(items).slice(0, Math.min(limit, items.length))
}

export function makeGardenTiles(items: LearnItem[]): GardenTile[] {
  const tiles: GardenTile[] = []
  for (const item of items) {
    const image = item.image || ''
    tiles.push({ id: `word:${item.word}`, word: item.word, kind: 'word', image })
    tiles.push({ id: `picture:${item.word}`, word: item.word, kind: 'picture', image })
  }
  return shuffleList(tiles)
}
