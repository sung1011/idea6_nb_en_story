import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageAudioRel, parseAndWriteStories, plainSpeakText } from './parseStory.mjs'
import fs from 'node:fs'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORIES_DIR = path.join(APP_ROOT, 'public', 'stories')
const PUBLIC_DIR = path.join(APP_ROOT, 'public')
const PYTHON = path.join(APP_ROOT, 'scripts', 'genStoryTts.py')

const EN_VOICE = 'en-US-AriaNeural'
const EN_RATE = '-15%'

const force = process.argv.includes('--force')

const written = parseAndWriteStories()
const clips = []

for (const item of written) {
  const story = JSON.parse(fs.readFileSync(path.join(STORIES_DIR, `${item.slug}.json`), 'utf8'))
  for (const page of story.pages ?? []) {
    const en = plainSpeakText(page.en)
    if (en) {
      clips.push({
        file: pageAudioRel(story.id, page.id, 'en'),
        text: en,
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
console.log('updated story JSON with audioEn paths')
