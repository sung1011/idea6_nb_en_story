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

const SPEAK_WORD = /[A-Za-z0-9']+/g

export function speakWords(text: string): string[] {
  return String(text ?? '').match(SPEAK_WORD) ?? []
}

function splitForFollow(chunk: EnSegment, startIndex: number): { parts: EnSegment[]; next: number } {
  const parts: EnSegment[] = []
  let index = startIndex
  const text = chunk.text
  let last = 0
  const re = new RegExp(SPEAK_WORD.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), highlight: chunk.highlight })
    }
    parts.push({
      text: match[0],
      highlight: chunk.highlight,
      learnWord: chunk.learnWord,
      wordIndex: index,
    })
    index += 1
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), highlight: chunk.highlight })
  }
  return { parts, next: index }
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
  let wordIndex = 0
  const out: EnSegment[] = []
  for (const chunk of chunks) {
    const split = splitForFollow(chunk, wordIndex)
    out.push(...split.parts)
    wordIndex = split.next
  }
  return out
}
