export const PRAISE_LINES = [
  'Great!',
  'Nice!',
  'Awesome!',
  'Exactly!',
  'Good!',
  'Not bad!',
  'Lucky!',
  'You got it!',
  'Well done!',
  'Super!',
  'Perfect!',
  'Yes!',
] as const

export type PraiseLine = (typeof PRAISE_LINES)[number]

let lastPraise = ''

/** Pick a random praise line, skipping the previous one when the pool allows. */
export function pickPraiseLine(): PraiseLine {
  const choices = PRAISE_LINES.filter((line) => line !== lastPraise)
  const pool = choices.length ? choices : PRAISE_LINES
  const next = pool[Math.floor(Math.random() * pool.length)] ?? PRAISE_LINES[0]
  lastPraise = next
  return next
}
