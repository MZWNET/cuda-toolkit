import { pickAllMatches, pickFirstMatch, PATCHES_REGEX } from './utils/regex-match.js'

const LEGACY_LINUX_RUNFILE_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*_linux[^"'\s><]*/gi
const LEGACY_LINUX_RUNFILE_FALLBACK_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*_linux[^"'\s><]*/gi
const LEGACY_LINUX_ARM64_RUNFILE_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*_(?:linux_sbsa|linux_aarch64|linux_arm64)[^"'\s><]*/gi
const LEGACY_WINDOWS_LOCAL_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/local_installers2?\/[^"'\s><]*(?:win|windows)[^"'\s><]*/gi
const LEGACY_WINDOWS_NETWORK_REGEX = /(?:https?:\/\/developer\.download\.nvidia\.com)?\/compute\/cuda\/[0-9.]+(?:\/Prod[^/]*)?\/network_installers2?\/[^"'\s><]*(?:win|windows)[^"'\s><]*_network(?:\.exe)?/gi
const WIN10_REGEX = /win10/i

export interface LegacyDownloadLinks {
  linuxUrl: string
  linuxArm64Url: string | null
  windowsLocalUrl: string
  windowsNetworkUrl: string
}

export function normalizeLegacyUrl(url: string): string {
  const trimmed = url.split('<')[0]?.trim() ?? url.trim()
  const safe = trimmed.split('"')[0]?.split('\'')[0]?.trim() ?? trimmed

  if (safe.startsWith('/compute/')) {
    return `https://developer.download.nvidia.com${safe}`
  }
  if (safe.startsWith('http://')) {
    return safe.replace('http://', 'https://')
  }
  return safe
}

export function pickWin10Preferred(urls: string[]): string | null {
  if (urls.length === 0)
    return null
  return urls.find(url => WIN10_REGEX.test(url)) ?? urls[0]
}

export function extractLegacyDownloadLinks(html: string): LegacyDownloadLinks | null {
  const linuxMatch = pickFirstMatch(LEGACY_LINUX_RUNFILE_REGEX, html)
    ?? pickFirstMatch(LEGACY_LINUX_RUNFILE_FALLBACK_REGEX, html)
  const linuxArm64Match = pickFirstMatch(LEGACY_LINUX_ARM64_RUNFILE_REGEX, html)
  const windowsLocalCandidates = pickAllMatches(LEGACY_WINDOWS_LOCAL_REGEX, html).map(normalizeLegacyUrl)
  const windowsNetworkCandidates = pickAllMatches(LEGACY_WINDOWS_NETWORK_REGEX, html).map(normalizeLegacyUrl)
  const windowsLocalUrl = pickWin10Preferred(windowsLocalCandidates)
  const windowsNetworkUrl = pickWin10Preferred(windowsNetworkCandidates)
  const linuxUrl = linuxMatch === null ? null : normalizeLegacyUrl(linuxMatch)
  const linuxArm64Url = linuxArm64Match === null ? null : normalizeLegacyUrl(linuxArm64Match)

  if (linuxUrl === null || windowsLocalUrl === null || windowsNetworkUrl === null) {
    return null
  }

  return { linuxUrl, linuxArm64Url, windowsLocalUrl, windowsNetworkUrl }
}

export function describeLegacyFailure(html: string): string {
  return [
    `hasLegacyLinux=${pickFirstMatch(LEGACY_LINUX_RUNFILE_REGEX, html) !== null}`,
    `hasLegacyWindowsLocal=${pickFirstMatch(LEGACY_WINDOWS_LOCAL_REGEX, html) !== null}`,
    `hasLegacyWindowsNetwork=${pickFirstMatch(LEGACY_WINDOWS_NETWORK_REGEX, html) !== null}`,
    `hasPatchesLinks=${PATCHES_REGEX.test(html)}`,
  ].join(' | ')
}
