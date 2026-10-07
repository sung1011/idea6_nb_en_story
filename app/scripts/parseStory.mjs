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

    pages.push({
      id,
      index,
      en,
      zh,
      pattern: fields['主练句式'] ?? '',
      focusWord: focus.focusWord,
      focusNote: focus.focusNote,
      focusRaw: focus.focusRaw,
      knowledge: fields['知识点'] ?? '',
      highlights,
      image: null,
      audioEn: null,
      audioZh: null,
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
