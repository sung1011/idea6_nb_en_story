import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  pageAudioRel,
  parseAndWriteStories,
  plainSpeakText,
  wordAudioRel,
} from './parseStory.mjs'
import fs from 'node:fs'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORIES_DIR = path.join(APP_ROOT, 'public', 'stories')
const PUBLIC_DIR = path.join(APP_ROOT, 'public')
const PYTHON = path.join(APP_ROOT, 'scripts', 'genStoryTts.py')

const EN_VOICE = 'en-US-AriaNeural'
const ZH_VOICE = 'zh-CN-XiaoxiaoNeural'
const EN_RATE = '-15%'
const ZH_RATE = '+0%'

const force = process.argv.includes('--force')

function storyHasAudio(slug) {
  const dir = path.join(PUBLIC_DIR, 'audio', slug)
  try {
    return fs.readdirSync(dir).some((name) => name.endsWith('.mp3'))
  } catch {
    return false
  }
}

const written = parseAndWriteStories()
const clips = []

const wordSeen = new Set()

for (const item of written) {
  if (!storyHasAudio(item.slug)) continue
  const story = JSON.parse(fs.readFileSync(path.join(STORIES_DIR, `${item.slug}.json`), 'utf8'))
  for (const page of story.pages ?? []) {
    const en = plainSpeakText(page.en)
    const zh = plainSpeakText(page.zh)
    if (en) {
      clips.push({
        file: pageAudioRel(story.id, page.id, 'en'),
        text: en,
        voice: EN_VOICE,
        rate: EN_RATE,
      })
    }
    if (zh) {
      clips.push({
        file: pageAudioRel(story.id, page.id, 'zh'),
        text: zh,
        voice: ZH_VOICE,
        rate: ZH_RATE,
      })
    }
    for (const learn of page.learnItems ?? []) {
      const word = String(learn.word ?? '').trim()
      const file = wordAudioRel(story.id, word)
      if (!word || !file || wordSeen.has(file)) continue
      wordSeen.add(file)
      clips.push({
        file,
        text: word,
        voice: EN_VOICE,
        rate: EN_RATE,
      })
    }
  }
}

console.log(`story clips ${clips.length} (force=${force})`)

const python = spawn('python3', [PYTHON, PUBLIC_DIR, force ? '--force' : '--skip-existing'], {
  stdio: ['pipe', 'inherit', 'inherit'],
})
python.stdin.write(JSON.stringify({ clips }))
python.stdin.end()

const code = await new Promise((resolve) => {
  python.on('exit', resolve)
  python.on('error', (err) => {
    console.error(err)
    resolve(1)
  })
})

if (code !== 0) process.exit(code ?? 1)

parseAndWriteStories()
console.log('updated story JSON with audioEn / audioZh / audioWord paths')
