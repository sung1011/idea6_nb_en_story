export interface AppVersion {
  id: string
  version: string
  date: string
  summary: string
}

export function isAppVersion(value: unknown): value is AppVersion {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.version === 'string' &&
    typeof entry.date === 'string' &&
    typeof entry.summary === 'string'
  )
}

export function parseVersions(data: unknown): AppVersion[] {
  if (!Array.isArray(data)) return []
  return data.filter(isAppVersion)
}
