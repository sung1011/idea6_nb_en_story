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

export interface VersionGroup {
  version: string
  date: string
  summaries: string[]
  ids: string[]
}

/** Group newest-first entries by `version`, keeping file order. */
export function groupVersions(entries: AppVersion[]): VersionGroup[] {
  const groups: VersionGroup[] = []
  const byVersion = new Map<string, VersionGroup>()
  for (const entry of entries) {
    let group = byVersion.get(entry.version)
    if (!group) {
      group = { version: entry.version, date: entry.date, summaries: [], ids: [] }
      byVersion.set(entry.version, group)
      groups.push(group)
    }
    group.summaries.push(entry.summary)
    group.ids.push(entry.id)
    if (entry.date > group.date) group.date = entry.date
  }
  return groups
}

export function findGroupIndex(groups: VersionGroup[], acked: string | null): number {
  if (!acked) return -1
  return groups.findIndex((group) => group.ids.includes(acked) || group.version === acked)
}
