export const PATCHES_REGEX = /patches/i

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
