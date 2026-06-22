import { extractVersion, extractVersionFromUrl } from '@/scripts/update-links/utils/version.js'

it('extractVersionFromUrl reads version from filename', () => {
  expect(extractVersionFromUrl('https://x/cuda_12.4.0_550.54.14_linux.run')).toBe('12.4.0')
})

it('extractVersionFromUrl falls back to the path segment', () => {
  expect(extractVersionFromUrl('https://developer.download.nvidia.com/compute/cuda/11.8.0/')).toBe('11.8.0')
})

it('extractVersionFromUrl returns null when no version is present', () => {
  expect(extractVersionFromUrl('https://example.com/foo')).toBeNull()
})

it('extractVersion reads version from the header title', () => {
  expect(extractVersion('CUDA Toolkit 12.6 Downloads')).toBe('12.6')
  expect(extractVersion(undefined)).toBeNull()
})
