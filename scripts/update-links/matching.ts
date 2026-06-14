import { PATCHES_REGEX, WIN10_REGEX } from './regex.js'

export function pickFirstMatch(regex: RegExp, input: string): string | null {
  regex.lastIndex = 0
  const match = regex.exec(input)
  if (match === null)
    return null
  return match[0] ?? null
}

export function pickAllMatches(regex: RegExp, input: string): string[] {
  regex.lastIndex = 0
  return Array.from(input.matchAll(regex), match => match[0])
    .filter((value): value is string => value !== undefined)
    .filter(value => !PATCHES_REGEX.test(value))
}

export function pickWin10Preferred(urls: string[]): string | null {
  if (urls.length === 0)
    return null
  return urls.find(url => WIN10_REGEX.test(url)) ?? urls[0]
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
