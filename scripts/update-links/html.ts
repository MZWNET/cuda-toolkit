import type { PageData } from './types.js'
import {
  REACT_PROPS_REGEX,
  URL_FILENAME_VERSION_REGEX,
  URL_VERSION_REGEX,
  VERSION_REGEX,
} from './regex.js'

function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function extractReactProps(html: string): PageData | null {
  const match = REACT_PROPS_REGEX.exec(html)
  if (match === null || match[1] === undefined || match[1] === '') {
    return null
  }

  const decoded = decodeHtmlEntities(match[1])
  return JSON.parse(decoded) as PageData
}

export function extractVersion(headerTitle?: string): string | null {
  if (headerTitle === undefined || headerTitle === '')
    return null
  const match = VERSION_REGEX.exec(headerTitle)
  if (match === null || match[1] === undefined || match[1] === '')
    return null
  return match[1]
}

export function extractVersionFromUrl(url: string): string | null {
  const filenameMatch = URL_FILENAME_VERSION_REGEX.exec(url)
  if (filenameMatch === null || filenameMatch[1] === undefined || filenameMatch[1] === '') {
    const pathMatch = URL_VERSION_REGEX.exec(url)
    if (pathMatch === null || pathMatch[1] === undefined || pathMatch[1] === '') {
      return null
    }
    return pathMatch[1]
  }
  return filenameMatch[1]
}
