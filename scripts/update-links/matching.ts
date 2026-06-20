import { WIN10_REGEX } from './regex.js'

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
