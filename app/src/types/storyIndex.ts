export interface StoryIndexEntry {
  id: string
  title: string
  titleZh: string
  tag?: string
}

export function isStoryIndexEntry(value: unknown): value is StoryIndexEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === 'string' && entry.id.length > 0 && typeof entry.title === 'string'
}

export function parseStoryIndex(data: unknown): StoryIndexEntry[] {
  if (!Array.isArray(data)) return []
  return data.filter(isStoryIndexEntry).map((entry) => {
    const mapped: StoryIndexEntry = {
      id: entry.id,
      title: entry.title,
      titleZh: typeof entry.titleZh === 'string' ? entry.titleZh : '',
    }
    const tag = typeof entry.tag === 'string' ? entry.tag.trim() : ''
    if (tag) mapped.tag = tag
    return mapped
  })
}
