import type { ArchiveEntry } from './types.js'
import { CUDA_ARCHIVE_URL } from './constants.js'
import { ARCHIVE_LEADING_VERSION_REGEX, ARCHIVE_LINK_REGEX } from './regex.js'

export async function fetchArchiveVersions(): Promise<ArchiveEntry[]> {
  const response = await fetch(CUDA_ARCHIVE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch CUDA toolkit archive: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const entries: ArchiveEntry[] = []
  const seen = new Set<string>()
  for (const match of html.matchAll(ARCHIVE_LINK_REGEX)) {
    const href = match[1]?.trim()
    const label = match[2]?.trim()
    if (href === undefined || href === '' || label === undefined || label === '')
      continue

    if (!label.startsWith('CUDA Toolkit'))
      continue
    if (label.includes('BSP'))
      continue

    const versionMatch = label.match(ARCHIVE_LEADING_VERSION_REGEX)
    const baseVersion = versionMatch?.[1] ?? null
    if (baseVersion === null)
      continue

    const dedupeKey = `${label}|${href}`
    if (seen.has(dedupeKey))
      continue

    entries.push({ url: new URL(href, CUDA_ARCHIVE_URL).toString(), label, baseVersion })
    seen.add(dedupeKey)

    if (baseVersion === '7.5')
      break
  }

  const hasTarget = entries.some(entry => entry.baseVersion === '7.5')
  if (!hasTarget) {
    throw new Error('Failed to locate CUDA Toolkit 7.5 in archive list.')
  }

  return entries
}
