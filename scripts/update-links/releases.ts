import type { DownloadLinks, ReleaseEntry } from './types.js'
import { extractReactProps, extractVersion, extractVersionFromUrl } from './html.js'
import { extractLegacyDownloadLinks } from './legacy.js'
import { pickFirstMatch } from './matching.js'
import { FALLBACK_DOWNLOAD_REGEX, LEGACY_LINUX_RUNFILE_REGEX, LEGACY_WINDOWS_LOCAL_REGEX, LEGACY_WINDOWS_NETWORK_REGEX, PATCHES_REGEX, PRIMARY_DOWNLOAD_REGEX } from './regex.js'

function extractDownloadUrl(details?: string): string {
  if (details === undefined || details === '') {
    throw new Error('Release details missing download link.')
  }

  const primary = PRIMARY_DOWNLOAD_REGEX.exec(details)
  if (primary !== null && primary[1] !== undefined && primary[1] !== '' && !PATCHES_REGEX.test(primary[1]))
    return primary[1]

  const fallback = FALLBACK_DOWNLOAD_REGEX.exec(details)
  if (fallback !== null && fallback[1] !== undefined && fallback[1] !== '' && !PATCHES_REGEX.test(fallback[1]))
    return fallback[1]

  throw new Error('Failed to extract download URL from release details.')
}

function pickRelease(
  releases: Record<string, ReleaseEntry>,
  preferredKeys: string[],
  fallbackMatcher: (key: string) => boolean,
): ReleaseEntry {
  for (const key of preferredKeys) {
    const entry = releases[key]
    if (entry !== undefined)
      return entry
  }

  const fallbackKey = Object.keys(releases).find(fallbackMatcher)
  if (fallbackKey === undefined) {
    throw new Error('No matching release entry found in CUDA downloads data.')
  }
  return releases[fallbackKey]
}

export async function fetchDownloadLinks(pageUrl: string): Promise<DownloadLinks> {
  const response = await fetch(pageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch CUDA downloads page: ${response.status} ${response.statusText} (${pageUrl})`)
  }

  const html = await response.text()
  const props = extractReactProps(html)
  if (props !== null) {
    const pageData = props.pageData
    const releases = pageData?.releases
    if (releases === undefined) {
      throw new Error('CUDA downloads data is missing releases.')
    }

    const linuxEntry = pickRelease(
      releases,
      [
        'Linux/x86_64/Ubuntu/24.04/runfile_local',
        'Linux/x86_64/Ubuntu/22.04/runfile_local',
      ],
      key => key.startsWith('Linux/x86_64/') && key.endsWith('/runfile_local'),
    )

    const windowsLocalEntry = pickRelease(
      releases,
      [
        'Windows/x86_64/11/exe_local',
        'Windows/x86_64/10/exe_local',
      ],
      key => key.startsWith('Windows/x86_64/') && key.endsWith('/exe_local'),
    )

    const windowsNetworkEntry = pickRelease(
      releases,
      [
        'Windows/x86_64/11/exe_network',
        'Windows/x86_64/10/exe_network',
      ],
      key => key.startsWith('Windows/x86_64/') && key.endsWith('/exe_network'),
    )

    const linuxUrl = extractDownloadUrl(linuxEntry.details)
    const windowsLocalUrl = extractDownloadUrl(windowsLocalEntry.details)
    const windowsNetworkUrl = extractDownloadUrl(windowsNetworkEntry.details)

    const version = extractVersionFromUrl(linuxUrl)
      ?? extractVersion(pageData?.header?.title)
    if (version === null) {
      throw new Error('Failed to determine CUDA Toolkit version from download URL or page header.')
    }

    return { version, linuxUrl, windowsLocalUrl, windowsNetworkUrl }
  }

  const legacy = extractLegacyDownloadLinks(html)
  if (legacy !== null) {
    const version = extractVersionFromUrl(legacy.linuxUrl)
    if (version === null) {
      throw new Error('Failed to determine CUDA Toolkit version from legacy download URLs.')
    }
    return { version, ...legacy }
  }

  throw new Error(
    [
      `Failed to locate download data on page: ${pageUrl}`,
      `Debug flags: hasReactProps=${props !== null}`,
      `hasLegacyLinux=${pickFirstMatch(LEGACY_LINUX_RUNFILE_REGEX, html) !== null}`,
      `hasLegacyWindowsLocal=${pickFirstMatch(LEGACY_WINDOWS_LOCAL_REGEX, html) !== null}`,
      `hasLegacyWindowsNetwork=${pickFirstMatch(LEGACY_WINDOWS_NETWORK_REGEX, html) !== null}`,
      `hasPatchesLinks=${PATCHES_REGEX.test(html)}`,
      `htmlLength=${html.length}`,
    ].join(' | '),
  )
}
