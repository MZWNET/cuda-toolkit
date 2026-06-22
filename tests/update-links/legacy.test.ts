import { normalizeLegacyUrl, pickWin10Preferred } from '@/scripts/update-links/legacy.js'

it('normalizeLegacyUrl upgrades http to https', () => {
  expect(normalizeLegacyUrl('http://developer.download.nvidia.com/x')).toBe('https://developer.download.nvidia.com/x')
})

it('normalizeLegacyUrl prepends the host for /compute paths', () => {
  expect(normalizeLegacyUrl('/compute/cuda/x_linux.run')).toBe('https://developer.download.nvidia.com/compute/cuda/x_linux.run')
})

it('normalizeLegacyUrl strips trailing markup', () => {
  expect(normalizeLegacyUrl('https://x/y.run"></a>')).toBe('https://x/y.run')
})

it('pickWin10Preferred prefers a win10 url', () => {
  expect(pickWin10Preferred(['a_win11.exe', 'b_win10.exe'])).toBe('b_win10.exe')
})

it('pickWin10Preferred falls back to the first url', () => {
  expect(pickWin10Preferred(['a.exe', 'b.exe'])).toBe('a.exe')
})

it('pickWin10Preferred returns null for an empty list', () => {
  expect(pickWin10Preferred([])).toBeNull()
})
