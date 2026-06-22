import { fetchText } from './utils/http.js'

const CUDA_ARCHIVE_URL = 'https://developer.nvidia.com/cuda-toolkit-archive'
const ARCHIVE_LINK_REGEX = /<a[^>]+href="([^"]+)"[^>]*>(CUDA Toolkit[^<]*)<\/a>/gi
const ARCHIVE_LEADING_VERSION_REGEX = /^CUDA Toolkit\s+(\d+\.\d+(?:\.\d+)?)/i
const CUDA_TOOLKIT_PREFIX_REGEX = /^CUDA Toolkit\s*/i

export interface ArchiveEntry {
  url: string
  label: string
  baseVersion: string | null
  version: string
}

export async function fetchArchiveVersions(): Promise<ArchiveEntry[]> {
  const html = await fetchText(CUDA_ARCHIVE_URL, 'Failed to fetch CUDA toolkit archive')
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

    entries.push({
      url: new URL(href, CUDA_ARCHIVE_URL).toString(),
      label,
      baseVersion,
      version: label.replace(CUDA_TOOLKIT_PREFIX_REGEX, ''),
    })
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
