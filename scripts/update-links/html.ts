import type { PageData } from './types.js'
import { REACT_PROPS_REGEX } from './regex.js'

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
