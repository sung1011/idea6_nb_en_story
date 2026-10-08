export interface LearnItem {
  word: string
  gloss: string
  image: string | null
}

export interface StoryPage {
  id: string
  index: number
  en: string
  zh: string
  pattern: string
  focusWord: string
  focusNote: string
  focusRaw: string
  knowledge: string
  gloss: string
  highlights: string[]
  learnItems: LearnItem[]
  image: string | null
  audioEn: string | null
}

export interface Story {
  id: string
  title: string
  titleZh: string
  version: string
  label: string
  scene: string
  structure: string
  notes: string
  source: string
  pageCount: number
  pages: StoryPage[]
}

export interface EnSegment {
  text: string
  highlight: boolean
  learnWord?: string
  wordIndex?: number
}
