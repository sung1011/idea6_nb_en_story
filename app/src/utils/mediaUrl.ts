import hashes from 'virtual:media-manifest'

export function mediaRel(file: string | null | undefined): string {
  return String(file || '')
    .trim()
    .replace(/^\//, '')
}

export function mediaUrl(file: string | null | undefined): string {
  const name = mediaRel(file)
  if (!name) return ''
  const url = `${import.meta.env.BASE_URL}${name}`
  const hash = hashes[name]
  return hash ? `${url}?v=${hash}` : url
}
