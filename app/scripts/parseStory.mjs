import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(APP_ROOT, '..')
const STORIES_DIR = path.join(REPO_ROOT, 'stories')
const OUT_DIR = path.join(APP_ROOT, 'public', 'stories')

/**
 * @param {string} md
 * @param {string} slug
 * @param {string} source
 */
export function parseStoryMarkdown(md, slug, source) {
  const titleLine = md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? slug
  const label = titleLine.match(/^([^·]+?)·/)?.[1]?.trim() ?? ''
  const title = titleLine.match(/·\s*([^（·]+?)\s*（/)?.[1]?.trim() ?? titleLine
  const titleZh = titleLine.match(/（([^）]+)）/)?.[1]?.trim() ?? ''
  const version = titleLine.match(/·\s*(v\d+)\s*$/i)?.[1] ?? ''

  const quotes = [...md.matchAll(/^>\s*(.+?)\s*$/gm)].map((m) => m[1].replace(/\s+$/, ''))
  const scene = stripLabel(quotes.find((q) => q.startsWith('场景：')) ?? '', '场景：')
  const structure = stripLabel(quotes.find((q) => q.startsWith('结构：')) ?? '', '结构：')
  const notes = quotes.find((q) => q.startsWith('篇幅：')) ?? quotes.filter((q) => !q.startsWith('场景：') && !q.startsWith('结构：')).join(' ')

  const body = md.split(/^##\s+/m)[0]
  const pages = []
  const pageRe = /###\s+(P(\d+))\s*\n([\s\S]*?)(?=\n###\s+P\d+|\s*$)/g

  let match
  while ((match = pageRe.exec(body)) !== null) {
    const id = match[1]
    const index = Number(match[2])
    const block = match[3]
      .split('\n')
      .filter((line) => line.trim() !== '---')
      .join('\n')
      .trim()
    const fields = parsePageFields(block)
    const { en, zh } = splitEnZh(fields['正文'] ?? '')
    const focus = parseFocus(fields['辅词'] ?? '')
    const highlights = [...en.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1])
    const knowledge = fields['知识点'] ?? ''
    const explicitGloss = fields['释义'] ?? ''
    const learnItems = buildLearnItems({
      slug,
      highlights,
      focusWord: focus.focusWord,
      focusRaw: focus.focusRaw,
      knowledge,
      explicitGloss,
      zh,
    })
    const primary = learnItems[0]

    pages.push({
      id,
      index,
      en,
      zh,
      pattern: fields['主练句式'] ?? '',
      focusWord: focus.focusWord,
      focusNote: focus.focusNote,
      focusRaw: focus.focusRaw,
      knowledge,
      gloss: primary?.gloss ?? '',
      highlights,
      learnItems,
      image: null,
      audioEn: existingAudio(slug, id, 'en'),
      audioZh: existingAudio(slug, id, 'zh'),
      audioWord: primary?.audioWord ?? null,
    })
  }

  pages.sort((a, b) => a.index - b.index)

  return {
    id: slug,
    title,
    titleZh,
    version,
    label,
    scene,
    structure,
    notes,
    source,
    pageCount: pages.length,
    pages,
  }
}

function stripLabel(text, label) {
  return text.startsWith(label) ? text.slice(label.length).trim() : text
}

/** @param {string} slug @param {string} pageId @param {'en' | 'zh'} lang */
export function pageAudioRel(slug, pageId, lang) {
  return `audio/${slug}/${String(pageId).toLowerCase()}-${lang}.mp3`
}

/** @param {string} slug @param {string} word */
export function wordAudioRel(slug, word) {
  const key = String(word ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return key ? `audio/${slug}/word-${key}.mp3` : ''
}

/**
 * Short zh glosses derived from Flag in the Fog 正文中文 / 辅词 / 知识点.
 * Used only when the page has no 释义: and notes do not already give a meaning.
 */
export const STORY_WORD_GLOSS = {
  flag: '旗子',
  fog: '雾',
  sand: '沙子',
  rock: '石头',
  box: '盒子',
  tin: '铁盒',
  rat: '老鼠',
  bag: '袋子',
  hill: '小山',
  den: '洞穴',
  sack: '空袋子',
  bun: '小面包',
  lock: '锁',
  key: '钥匙',
}

const META_NOTE =
  /第\s*\d+\s*章|第\s*\d+\s*课|回调|不加粗|下页|词包|疑问|存在句|听辨|方位|线索|场景|对比|顶格|复现|同课|请求|商量|和解|礼貌|交接|感叹|收束|发现|闭环/

/** @param {string} focusWord */
export function splitFocusWords(focusWord) {
  if (!focusWord) return []
  return focusWord
    .split(/\s*\/\s*/)
    .map((part) =>
      part
        .replace(/道具|回调|不加粗/g, '')
        .replace(/[^\p{L}'-]+/gu, ' ')
        .trim(),
    )
    .filter((word) => /^[A-Za-z][A-Za-z'\- ]{0,24}$/.test(word))
}

/**
 * @param {{ word: string, focusRaw?: string, knowledge?: string, explicitGloss?: string, zh?: string }} input
 */
export function deriveGloss({ word, focusRaw = '', knowledge = '', explicitGloss = '', zh = '' }) {
  const trimmed = String(explicitGloss ?? '').trim()
  if (trimmed) return trimmed

  const key = String(word ?? '').trim()
  if (!key) return ''

  const fromFocus = glossFromLabeledNote(key, focusRaw)
  if (fromFocus) return fromFocus

  const fromKnowledge = glossFromKnowledge(key, knowledge)
  if (fromKnowledge) return fromKnowledge

  const fromZh = glossFromPageZh(key, zh)
  if (fromZh) return fromZh

  return STORY_WORD_GLOSS[key.toLowerCase()] ?? ''
}

/** Strip markdown bold markers so TTS reads the spoken sentence. */
export function plainSpeakText(text) {
  return String(text ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @param {string} slug @param {string} pageId @param {'en' | 'zh'} lang */
function existingAudio(slug, pageId, lang) {
  const rel = pageAudioRel(slug, pageId, lang)
  return existingRel(rel)
}

/** @param {string} slug @param {string} word */
function existingWordAudio(slug, word) {
  const rel = wordAudioRel(slug, word)
  return rel ? existingRel(rel) : null
}

/** @param {string} rel */
function existingRel(rel) {
  const abs = path.join(APP_ROOT, 'public', rel)
  try {
    return fs.statSync(abs).size > 0 ? rel : null
  } catch {
    return null
  }
}

/**
 * @param {{
 *   slug: string
 *   highlights: string[]
 *   focusWord: string
 *   focusRaw: string
 *   knowledge: string
 *   explicitGloss: string
 *   zh: string
 * }} input
 */
function buildLearnItems({ slug, highlights, focusWord, focusRaw, knowledge, explicitGloss, zh }) {
  const seen = new Set()
  const words = []
  for (const raw of [...highlights, ...splitFocusWords(focusWord)]) {
    const word = String(raw ?? '').trim()
    const key = word.toLowerCase()
    if (!word || seen.has(key)) continue
    seen.add(key)
    words.push(key)
  }

  return words
    .map((word, index) => {
      const gloss = deriveGloss({
        word,
        focusRaw,
        knowledge,
        explicitGloss: index === 0 ? explicitGloss : '',
        zh,
      })
      return {
        word,
        gloss,
        audioWord: existingWordAudio(slug, word),
      }
    })
    .filter((item) => item.gloss)
}

/** @param {string} word @param {string} raw */
function glossFromLabeledNote(word, raw) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = raw.match(new RegExp(`${escaped}[^/；;]*（([^）]+)）`, 'i'))
  const note = match?.[1]?.trim() ?? ''
  if (!note || META_NOTE.test(note) || !/[\u4e00-\u9fff]/.test(note)) return ''
  return shortZh(note)
}

/** @param {string} word @param {string} knowledge */
function glossFromKnowledge(word, knowledge) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = knowledge.match(
    new RegExp(`(?:^|[；;、/]\\s*)${escaped}\\s+([\\u4e00-\\u9fff]{1,6})`, 'i'),
  )
  const note = match?.[1]?.trim() ?? ''
  if (!note || META_NOTE.test(note) || /^[与的在是再和]/.test(note)) return ''
  return shortZh(note)
}

/** @param {string} word @param {string} zh */
function glossFromPageZh(word, zh) {
  const fallback = STORY_WORD_GLOSS[word.toLowerCase()]
  if (!fallback || !zh) return ''
  if (zh.includes(fallback)) return fallback
  const shorter = fallback.replace(/^(小|空|大)/, '')
  if (shorter && zh.includes(shorter)) return fallback
  return ''
}

/** @param {string} text */
function shortZh(text) {
  return text
    .replace(/[，。；、].*$/, '')
    .replace(/\s+/g, '')
    .slice(0, 8)
}

/**
 * @param {string} block
 * @returns {Record<string, string>}
 */
function parsePageFields(block) {
  const fields = {}
  const lines = block.split('\n')
  let current = ''
  for (const line of lines) {
    const labeled = line.match(/^([^:：]{1,20})[:：]\s*(.*)$/)
    if (labeled) {
      current = labeled[1].trim()
      fields[current] = labeled[2].trim()
    } else if (current) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim()
    }
  }
  return fields
}

function splitEnZh(正文) {
  const m = 正文.match(/^(.*)（([^）]*)）\s*$/)
  if (!m) {
    return { en: 正文.trim(), zh: '' }
  }
  return { en: m[1].trim(), zh: m[2].trim() }
}

function parseFocus(raw) {
  const focusRaw = raw.trim()
  if (!focusRaw || focusRaw === '—' || focusRaw.startsWith('—')) {
    const notes = [...focusRaw.matchAll(/（([^）]*)）/g)].map((m) => m[1])
    return { focusWord: '', focusNote: notes.join('；'), focusRaw }
  }
  const notes = [...focusRaw.matchAll(/（([^）]*)）/g)].map((m) => m[1])
  const word = focusRaw
    .replace(/（[^）]*）/g, '')
    .replace(/；/g, ' / ')
    .replace(/\s+\/\s+/g, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return { focusWord: word, focusNote: notes.join('；'), focusRaw }
}

export function parseAndWriteStories() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const files = fs.readdirSync(STORIES_DIR).filter((name) => name.endsWith('.md'))
  if (files.length === 0) {
    throw new Error(`No markdown stories in ${STORIES_DIR}`)
  }

  const written = []
  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const source = `stories/${file}`
    const md = fs.readFileSync(path.join(STORIES_DIR, file), 'utf8')
    const story = parseStoryMarkdown(md, slug, source)
    if (slug === 'flag-in-the-fog' && story.pageCount !== 22) {
      throw new Error(`Expected 22 pages for flag-in-the-fog, got ${story.pageCount}`)
    }
    const outFile = path.join(OUT_DIR, `${slug}.json`)
    fs.writeFileSync(outFile, `${JSON.stringify(story, null, 2)}\n`)
    written.push({ slug, pageCount: story.pageCount, outFile })
  }
  return written
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const written = parseAndWriteStories()
  for (const item of written) {
    console.log(`Wrote ${item.slug} (${item.pageCount} pages)`)
  }
}
