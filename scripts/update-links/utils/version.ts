const VERSION_REGEX = /CUDA Toolkit\s+([0-9.]+)/i
const URL_VERSION_REGEX = /https:\/\/developer\.download\.nvidia\.com\/compute\/cuda\/([0-9.]+)\//
const URL_FILENAME_VERSION_REGEX = /cuda_([0-9.]+)[_.]/i

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
