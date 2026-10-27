import type { LearnItem } from '@/types/story'
import { collectWordCards, shuffleList } from '@/utils/wordMatchGarden'

export const SPOTLIGHT_QUESTION_COUNT = 6
export const SPOTLIGHT_CHOICE_COUNT = 3
export const SPOTLIGHT_MIN_WORDS = 3

export interface SpotlightSlot {
  left: number
  top: number
}

export interface SpotlightCard {
  word: string
  image: string
  left: number
  top: number
}

export interface SpotlightQuestion {
  target: string
  cards: SpotlightCard[]
}

/** Percent positions for three word cards; shuffled each question. */
export const SPOTLIGHT_SLOTS: SpotlightSlot[] = [
  { left: 7, top: 8 },
  { left: 56, top: 10 },
  { left: 30, top: 50 },
]

export { collectWordCards, shuffleList }

export function makeSpotlightRound(
  items: LearnItem[],
  count = SPOTLIGHT_QUESTION_COUNT,
): SpotlightQuestion[] {
  if (items.length < SPOTLIGHT_MIN_WORDS) return []
  const targets = shuffleList(items)
  const questions: SpotlightQuestion[] = []
  for (let i = 0; i < count; i += 1) {
    const target = targets[i % targets.length]
    if (!target) continue
    const targetKey = target.word.toLowerCase()
    const others = shuffleList(items.filter((item) => item.word.toLowerCase() !== targetKey))
    const mix = shuffleList([target, ...others.slice(0, SPOTLIGHT_CHOICE_COUNT - 1)])
    const slots = shuffleList(SPOTLIGHT_SLOTS)
    questions.push({
      target: target.word,
      cards: mix.map((item, idx) => {
        const slot = slots[idx] ?? { left: 30, top: 20 }
        return {
          word: item.word,
          image: item.image || '',
          left: slot.left,
          top: slot.top,
        }
      }),
    })
  }
  return questions
}
