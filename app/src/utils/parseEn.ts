import type { EnSegment } from '@/types/story'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitPlainByLearnWords(text: string, learnWords: string[]): EnSegment[] {
  const unique = [...new Set(learnWords.map((word) => word.trim()).filter(Boolean))]
  if (!text) return []
  if (!unique.length) return [{ text, highlight: false }]
  const pattern = new RegExp(`\\b(${unique.map(escapeRegExp).join('|')})\\b`, 'gi')
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => {
      const learnWord = unique.find((word) => word.toLowerCase() === part.toLowerCase())
      return learnWord
        ? { text: part, highlight: false, learnWord }
        : { text: part, highlight: false }
    })
}

export function parseEnSegments(en: string, learnWords: string[] = []): EnSegment[] {
  const chunks = en
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .flatMap((part) => {
      const wrapped = part.match(/^\*\*([^*]+)\*\*$/)
      if (wrapped) {
        const text = wrapped[1]
        const learnWord =
          learnWords.find((word) => word.toLowerCase() === text.toLowerCase()) ?? text
        return [{ text, highlight: true, learnWord }]
      }
      return splitPlainByLearnWords(part, learnWords)
    })
  return chunks
}
