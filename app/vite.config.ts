import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { parseAndWriteStories } from './scripts/parseStory.mjs'

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

export default defineConfig({
  base: APP_BASE,
  plugins: [
    vue(),
    parseStoriesPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      filename: 'sw.js',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'appleTouchIcon.png', 'pwa192.png', 'pwa512.png'],
      manifest: {
        id: APP_BASE,
        name: '星词岛故事',
        short_name: '星词岛故事',
        description: '星词岛英语绘本阅读器：翻页阅读 Flag in the Fog（雾里的旗）',
        lang: 'zh-CN',
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
            purpose: 'any',
          },
          {
            src: 'pwa512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
            urlPattern: /\/images\/.*\.(?:webp|png|jpe?g)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-image-cache-first',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/audio\/.*\.(?:mp3|ogg|m4a|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-audio-cache-first',
              expiration: {
                maxEntries: 120,
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
