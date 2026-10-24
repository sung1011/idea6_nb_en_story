export interface GameIndexEntry {
  id: string
  title: string
  titleZh?: string
  cover: string
  openStoryIds: string[]
}

export interface GamesIndex {
  games: GameIndexEntry[]
}

export interface OrchardItem {
  hole: string
  hear: string
  answer: string
  choices: string[]
  mode?: 'letter' | 'whole'
}

export interface OrchardRound {
  id: string
  fruit: string
  items: OrchardItem[]
}

export interface OrchardChapter {
  storyId: string
  title: string
  titleZh?: string
  rounds: OrchardRound[]
}

export function isGameIndexEntry(value: unknown): value is GameIndexEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.title === 'string' &&
    typeof entry.cover === 'string' &&
    Array.isArray(entry.openStoryIds)
  )
}

export function parseGamesIndex(data: unknown): GameIndexEntry[] {
  if (!data || typeof data !== 'object') return []
  const games = (data as Record<string, unknown>).games
  if (!Array.isArray(games)) return []
  return games.filter(isGameIndexEntry).map((entry) => ({
    id: entry.id,
    title: entry.title,
    titleZh: typeof entry.titleZh === 'string' ? entry.titleZh : '',
    cover: entry.cover,
    openStoryIds: entry.openStoryIds.filter((id): id is string => typeof id === 'string'),
  }))
}
