import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const MEDIA_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg', '.mp3'])

/**
 * Map public-relative paths (e.g. audio/spot-the-cub/p18-en.mp3) to the first
 * 8 hex chars of the file's SHA-1. Used to cache-bust CacheFirst media URLs.
 * @param {string} publicDir
 * @returns {Record<string, string>}
 */
export function buildMediaManifest(publicDir) {
  /** @type {Record<string, string>} */
  const manifest = {}

  function walk(rel) {
    const abs = path.join(publicDir, rel)
    if (!fs.existsSync(abs)) return
    for (const name of fs.readdirSync(abs)) {
      const nextRel = `${rel}/${name}`.replaceAll('\\', '/')
      const nextAbs = path.join(publicDir, nextRel)
      const stat = fs.statSync(nextAbs)
      if (stat.isDirectory()) {
        walk(nextRel)
        continue
      }
      const ext = path.extname(name).toLowerCase()
      const isTimings = name === 'timings.json'
      if (!MEDIA_EXT.has(ext) && !isTimings) continue
      const hash = crypto.createHash('sha1').update(fs.readFileSync(nextAbs)).digest('hex').slice(0, 8)
      manifest[nextRel] = hash
    }
  }

  walk('images')
  walk('audio')
  return manifest
}
