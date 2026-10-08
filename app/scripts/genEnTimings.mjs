import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageAudioRel, parseAndWriteStories, plainSpeakText } from './parseStory.mjs'

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORIES_DIR = path.join(APP_ROOT, 'public', 'stories')
const PUBLIC_DIR = path.join(APP_ROOT, 'public')
const PYTHON = path.join(APP_ROOT, 'scripts', 'genEnTimings.py')

const EN_VOICE = 'en-US-AriaNeural'
const EN_RATE = '-15%'

parseAndWriteStories()
const clips = []

for (const name of fs.readdirSync(STORIES_DIR).filter((file) => file.endsWith('.json'))) {
  const story = JSON.parse(fs.readFileSync(path.join(STORIES_DIR, name), 'utf8'))
  if (!story.id || !Array.isArray(story.pages)) continue
  for (const page of story.pages) {
    const en = plainSpeakText(page.en)
    if (!en) continue
    clips.push({
      file: pageAudioRel(story.id, page.id, 'en'),
      text: en,
      voice: EN_VOICE,
      rate: EN_RATE,
      lang: 'en',
      storyId: story.id,
      pageId: page.id,
    })
  }
}

console.log(`en timing clips ${clips.length}`)

const python = spawn('python3', [PYTHON, PUBLIC_DIR], {
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
