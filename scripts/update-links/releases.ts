import type { ReleaseChannel } from './archive.js'
import { describeLegacyFailure, extractLegacyDownloadLinks } from './legacy.js'
import { fetchText } from './utils/http.js'
import { PATCHES_REGEX } from './utils/regex-match.js'
import { extractVersion, extractVersionFromUrl } from './utils/version.js'

const PRIMARY_DOWNLOAD_REGEX = /targetDownloadButtonHref[^>]+href="([^"]+)"/
const FALLBACK_DOWNLOAD_REGEX = /href="(https:\/\/developer\.download\.nvidia\.com\/compute\/cuda\/[^"]+)"/
const PREVIEW_KEYRING_REGEX = /https:\/\/packages\.nvidia\.com\/[\w.-]+\/nvidia-preview-keyring\.deb/i
const REACT_PROPS_REGEX = /data-react-props="([^"]+)"/
const LINUX_X86_NETWORK_KEY_REGEX = /^Linux\/x86_64\/Ubuntu\/([^/]+)\/deb_network$/
const LINUX_ARM64_NETWORK_KEY_REGEX =
  /^Linux\/(?:arm64-sbsa|sbsa|arm64|aarch64)\/(?:Native\/)?Ubuntu\/([^/]+)\/deb_network$/

interface ReleaseEntry {
  details?: string
}

interface PageData {
  pageData?: {
    header?: { title?: string }
    releases?: Record<string, ReleaseEntry>
  }
}

interface ArchitectureLinks {
  x86_64: string | null
  arm64: string | null
}

interface LinuxNetworkLinks {
  x86_64: Record<string, string>
  arm64: Record<string, string>
}

export interface DownloadLinks {
  version: string
  channel: ReleaseChannel
  linuxLocal: ArchitectureLinks
  linuxNetwork: LinuxNetworkLinks
  windowsLocal: ArchitectureLinks
  windowsNetwork: ArchitectureLinks
}

function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function extractReactProps(html: string): PageData | null {
  const match = REACT_PROPS_REGEX.exec(html)
  if (match === null || match[1] === undefined || match[1] === '') {
    return null
  }
  const decoded = decodeHtmlEntities(match[1])
  return JSON.parse(decoded) as PageData
}

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

function extractPreviewKeyringUrl(details?: string): string {
  if (details === undefined || details === '') {
    throw new Error('Preview release details missing repository keyring URL.')
  }

  const match = PREVIEW_KEYRING_REGEX.exec(details)
  if (match === null || match[0] === '') {
    throw new Error('Failed to extract preview repository keyring URL.')
  }
  return match[0]
}

function pickReleaseOptional(
  releases: Record<string, ReleaseEntry>,
  preferredKeys: string[],
  fallbackMatcher: (key: string) => boolean,
): ReleaseEntry | null {
  for (const key of preferredKeys) {
    const entry = releases[key]
    if (entry !== undefined) return entry
  }

  const fallbackKey = Object.keys(releases).find(fallbackMatcher)
  if (fallbackKey === undefined) {
    return null
  }
  return releases[fallbackKey]
}

function extractOptionalDownloadUrl(entry: ReleaseEntry | null): string | null {
  return entry === null ? null : extractDownloadUrl(entry.details)
}

function parseLinuxPreviewNetwork(releases: Record<string, ReleaseEntry>): {
  links: LinuxNetworkLinks
  installerUrls: string[]
} {
  const links: LinuxNetworkLinks = { x86_64: {}, arm64: {} }
  const installerUrls: string[] = []

  for (const [key, entry] of Object.entries(releases)) {
    const x86Match = key.match(LINUX_X86_NETWORK_KEY_REGEX)
    const arm64Match = key.match(LINUX_ARM64_NETWORK_KEY_REGEX)
    const ubuntuVersion = x86Match?.[1] ?? arm64Match?.[1]
    if (ubuntuVersion === undefined) continue

    const arch = x86Match === null ? 'arm64' : 'x86_64'
    links[arch][ubuntuVersion] = extractPreviewKeyringUrl(entry.details)
    installerUrls.push(extractDownloadUrl(entry.details))
  }

  return { links, installerUrls }
}

function parseModernDownloadLinks(props: PageData, pageUrl: string, channel: ReleaseChannel): DownloadLinks {
  const pageData = props.pageData
  const releases = pageData?.releases
  if (releases === undefined) {
    throw new Error(`CUDA downloads data is missing releases: ${pageUrl}`)
  }

  const linuxX86Entry = pickReleaseOptional(
    releases,
    ['Linux/x86_64/Ubuntu/24.04/runfile_local', 'Linux/x86_64/Ubuntu/22.04/runfile_local'],
    key => key.startsWith('Linux/x86_64/') && key.endsWith('/runfile_local'),
  )
  const linuxArm64Entry = pickReleaseOptional(
    releases,
    [
      'Linux/arm64-sbsa/Ubuntu/24.04/runfile_local',
      'Linux/arm64-sbsa/Ubuntu/22.04/runfile_local',
      'Linux/sbsa/Ubuntu/24.04/runfile_local',
      'Linux/sbsa/Ubuntu/22.04/runfile_local',
      'Linux/arm64/Ubuntu/24.04/runfile_local',
      'Linux/arm64/Ubuntu/22.04/runfile_local',
      'Linux/aarch64/Ubuntu/24.04/runfile_local',
      'Linux/aarch64/Ubuntu/22.04/runfile_local',
    ],
    key =>
      (key.startsWith('Linux/arm64-sbsa/') ||
        key.startsWith('Linux/sbsa/') ||
        key.startsWith('Linux/arm64/') ||
        key.startsWith('Linux/aarch64/')) &&
      key.endsWith('/runfile_local'),
  )
  const windowsX86LocalEntry = pickReleaseOptional(
    releases,
    ['Windows/x86_64/11/exe_local', 'Windows/x86_64/10/exe_local'],
    key => key.startsWith('Windows/x86_64/') && key.endsWith('/exe_local'),
  )
  const windowsArm64LocalEntry = pickReleaseOptional(
    releases,
    ['Windows/arm64/11/exe_local'],
    key => key.startsWith('Windows/arm64/') && key.endsWith('/exe_local'),
  )
  const windowsX86NetworkEntry = pickReleaseOptional(
    releases,
    ['Windows/x86_64/11/exe_network', 'Windows/x86_64/10/exe_network'],
    key => key.startsWith('Windows/x86_64/') && key.endsWith('/exe_network'),
  )
  const windowsArm64NetworkEntry = pickReleaseOptional(
    releases,
    ['Windows/arm64/11/exe_network'],
    key => key.startsWith('Windows/arm64/') && key.endsWith('/exe_network'),
  )

  const linuxLocal: ArchitectureLinks = {
    x86_64: extractOptionalDownloadUrl(linuxX86Entry),
    arm64: extractOptionalDownloadUrl(linuxArm64Entry),
  }
  const windowsLocal: ArchitectureLinks = {
    x86_64: extractOptionalDownloadUrl(windowsX86LocalEntry),
    arm64: extractOptionalDownloadUrl(windowsArm64LocalEntry),
  }
  const windowsNetwork: ArchitectureLinks = {
    x86_64: extractOptionalDownloadUrl(windowsX86NetworkEntry),
    arm64: extractOptionalDownloadUrl(windowsArm64NetworkEntry),
  }
  const previewNetwork =
    channel === 'preview' ? parseLinuxPreviewNetwork(releases) : { links: { x86_64: {}, arm64: {} }, installerUrls: [] }

  if (
    channel === 'stable' &&
    (linuxLocal.x86_64 === null || windowsLocal.x86_64 === null || windowsNetwork.x86_64 === null)
  ) {
    throw new Error(`Stable CUDA release is missing a required x86_64 installer: ${pageUrl}`)
  }

  const versionSources = [
    linuxLocal.x86_64,
    linuxLocal.arm64,
    windowsLocal.x86_64,
    windowsLocal.arm64,
    windowsNetwork.x86_64,
    windowsNetwork.arm64,
    ...previewNetwork.installerUrls,
  ].filter((url): url is string => url !== null)

  if (versionSources.length === 0) {
    throw new Error(`No supported download entries found on CUDA downloads page: ${pageUrl}`)
  }

  const version =
    versionSources.map(extractVersionFromUrl).find((candidate): candidate is string => candidate !== null) ??
    extractVersion(pageData?.header?.title)
  if (version === null) {
    throw new Error(`Failed to determine CUDA Toolkit version: ${pageUrl}`)
  }

  return {
    version,
    channel,
    linuxLocal,
    linuxNetwork: previewNetwork.links,
    windowsLocal,
    windowsNetwork,
  }
}

export function parseDownloadLinks(html: string, pageUrl: string, channel: ReleaseChannel): DownloadLinks {
  const props = extractReactProps(html)
  if (props !== null) {
    return parseModernDownloadLinks(props, pageUrl, channel)
  }

  const legacy = extractLegacyDownloadLinks(html)
  if (legacy !== null) {
    const version = extractVersionFromUrl(legacy.linuxUrl)
    if (version === null) {
      throw new Error('Failed to determine CUDA Toolkit version from legacy download URLs.')
    }
    return {
      version,
      channel,
      linuxLocal: { x86_64: legacy.linuxUrl, arm64: legacy.linuxArm64Url },
      linuxNetwork: { x86_64: {}, arm64: {} },
      windowsLocal: { x86_64: legacy.windowsLocalUrl, arm64: null },
      windowsNetwork: { x86_64: legacy.windowsNetworkUrl, arm64: null },
    }
  }

  throw new Error(
    [
      `Failed to locate download data on page: ${pageUrl}`,
      `Debug flags: hasReactProps=${props !== null}`,
      describeLegacyFailure(html),
      `htmlLength=${html.length}`,
    ].join(' | '),
  )
}

export async function fetchDownloadLinks(pageUrl: string, channel: ReleaseChannel): Promise<DownloadLinks> {
  const html = await fetchText(pageUrl, `Failed to fetch CUDA downloads page (${pageUrl})`)
  const result = parseDownloadLinks(html, pageUrl, channel)
  const support = [
    result.windowsLocal.x86_64 === null ? null : 'Windows local: x86_64',
    result.windowsLocal.arm64 === null ? null : 'Windows local: ARM64',
    result.windowsNetwork.x86_64 === null ? null : 'Windows network: x86_64',
    result.linuxLocal.x86_64 === null ? null : 'Linux local: x86_64',
    result.linuxLocal.arm64 === null ? null : 'Linux local: ARM64',
    Object.keys(result.linuxNetwork.x86_64).length === 0 ? null : 'Linux network: x86_64',
    Object.keys(result.linuxNetwork.arm64).length === 0 ? null : 'Linux network: ARM64',
  ].filter((value): value is string => value !== null)
  console.log(`Parsed ${result.version} (${result.channel}), support: ${support.join(', ')}`)
  return result
}
