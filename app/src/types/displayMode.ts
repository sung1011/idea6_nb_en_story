export const DISPLAY_MODES = ['en', 'en+zh', 'zh'] as const

export type DisplayMode = (typeof DISPLAY_MODES)[number]

export const DISPLAY_MODE_OPTIONS: Array<{
  id: DisplayMode
  label: string
  hint: string
}> = [
  { id: 'en', label: 'EN', hint: 'English only' },
  { id: 'en+zh', label: 'EN+中', hint: 'Bilingual' },
  { id: 'zh', label: '中', hint: 'Chinese only' },
]

export function isDisplayMode(value: string | null): value is DisplayMode {
  return value === 'en' || value === 'en+zh' || value === 'zh'
}
