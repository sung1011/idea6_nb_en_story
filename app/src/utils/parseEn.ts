import type { EnSegment } from '@/types/story'

export function parseEnSegments(en: string): EnSegment[] {
  return en
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part) => {
      const wrapped = part.match(/^\*\*([^*]+)\*\*$/)
      return wrapped
        ? { text: wrapped[1], highlight: true }
        : { text: part, highlight: false }
    })
}
