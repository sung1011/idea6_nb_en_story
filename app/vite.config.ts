import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { parseAndWriteStories } from './scripts/parseStory.mjs'
import { buildMediaManifest } from './scripts/mediaManifest.mjs'

const APP_BASE = '/idea6_nb_en_story/'
const THEME_COLOR = '#7ec8c0'
const BACKGROUND_COLOR = '#f3ead8'

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

const MEDIA_VIRTUAL = 'virtual:media-manifest'
const MEDIA_RESOLVED = `\0${MEDIA_VIRTUAL}`

function mediaManifestPlugin(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url))
  const imagesDir = path.join(publicDir, 'images')
  const audioDir = path.join(publicDir, 'audio')
  let hashes: Record<string, string> = {}

  function refresh() {
    hashes = buildMediaManifest(publicDir)
  }

  return {
    name: 'media-manifest',
    buildStart() {
      refresh()
    },
    configureServer(server) {
      refresh()
      server.watcher.add(imagesDir)
      server.watcher.add(audioDir)
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(imagesDir) && !file.startsWith(audioDir)) return
        refresh()
        const mod = server.moduleGraph.getModuleById(MEDIA_RESOLVED)
        if (mod) void server.reloadModule(mod)
      })
    },
    resolveId(id) {
      if (id === MEDIA_VIRTUAL) return MEDIA_RESOLVED
    },
    load(id) {
      if (id !== MEDIA_RESOLVED) return
      return `export default ${JSON.stringify(hashes)}`
    },
  }
}

export default defineConfig({
  base: APP_BASE,
  plugins: [
    vue(),
    parseStoriesPlugin(),
    mediaManifestPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      filename: 'sw.js',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.png', 'appleTouchIcon.png', 'pwa192.png', 'pwa512.png'],
      manifest: {
        id: APP_BASE,
        name: 'Star Word Island',
        short_name: 'Star Words',
        description: 'Star Word Island English picture-book reader: page through Flag in the Fog',
        lang: 'en',
        start_url: APP_BASE,
        scope: APP_BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: BACKGROUND_COLOR,
        theme_color: THEME_COLOR,
        categories: ['education', 'kids'],
        icons: [
          {
            src: 'pwa192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          'index.html',
          'manifest.json',
          '**/*.{js,css,woff,woff2}',
          'stories/**/*.json',
        ],
        globIgnores: ['**/*.{mp3,ogg,m4a,wav}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/images\/.*\.(?:webp|png|jpe?g)(?:\?|$)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-image-cache-first-v0.6.28',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/audio\/.*(?:\.(?:mp3|ogg|m4a|wav)|\/timings\.json)(?:\?|$)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-audio-cache-first-v0.6.28',
              rangeRequests: true,
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/versions\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-versions-network-first',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              matchOptions: {
                ignoreSearch: true,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
