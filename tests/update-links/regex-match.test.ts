import { pickAllMatches, pickFirstMatch } from '@/scripts/update-links/utils/regex-match.js'

it('pickFirstMatch returns first full match or null', () => {
  expect(pickFirstMatch(/\d+/g, 'abc123def456')).toBe('123')
  expect(pickFirstMatch(/xyz/g, 'abc')).toBeNull()
})

it('pickFirstMatch resets lastIndex so a global regex stays reusable', () => {
  const re = /\d+/g
  expect(pickFirstMatch(re, 'a1')).toBe('1')
  expect(pickFirstMatch(re, 'b2')).toBe('2')
})

it('pickAllMatches returns all matches and filters out patches links', () => {
  const input = 'cuda_linux.run cuda_patches_linux.run cuda2_linux.run'
  expect(pickAllMatches(/[a-z0-9_]+_linux\.run/gi, input)).toEqual([
    'cuda_linux.run',
    'cuda2_linux.run',
  ])
})
