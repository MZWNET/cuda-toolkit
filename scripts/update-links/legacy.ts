import type { LegacyDownloadLinks } from './types.js'
import { normalizeLegacyUrl, pickWin10Preferred } from './matching.js'
import { pickAllMatches, pickFirstMatch } from './utils/regex-match.js'
import {
  LEGACY_LINUX_ARM64_RUNFILE_REGEX,
  LEGACY_LINUX_RUNFILE_FALLBACK_REGEX,
  LEGACY_LINUX_RUNFILE_REGEX,
  LEGACY_WINDOWS_LOCAL_REGEX,
  LEGACY_WINDOWS_NETWORK_REGEX,
} from './regex.js'

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
