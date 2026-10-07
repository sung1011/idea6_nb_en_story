import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { parseAndWriteStories } from './scripts/parseStory.mjs'

function parseStoriesPlugin(): Plugin {
  const storiesDir = fileURLToPath(new URL('../stories', import.meta.url))

  return {
    name: 'parse-stories',
    buildStart() {
      parseAndWriteStories()
    },
    configureServer(server) {
      parseAndWriteStories()
      server.watcher.add(storiesDir)
      server.watcher.on('change', (file) => {
        if (file.endsWith('.md') && file.includes(`${storiesDir}`)) {
          parseAndWriteStories()
        }
      })
    },
  }
}

export default defineConfig({
  base: '/idea6_nb_en_story/',
  plugins: [vue(), parseStoriesPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
