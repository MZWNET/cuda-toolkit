import os from 'node:os'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOs, getRelease, OSType } from '../src/platform.js'

vi.mock('node:os', () => ({
  default: {
    platform: vi.fn(),
    release: vi.fn(),
  },
}))

describe('platform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect linux platform', async () => {
    vi.mocked(os.platform).mockReturnValue('linux')
    const osPlatform = await getOs()
    expect(osPlatform).toBe(OSType.linux)
  })

  it('should detect windows platform', async () => {
    vi.mocked(os.platform).mockReturnValue('win32')
    const osPlatform = await getOs()
    expect(osPlatform).toBe(OSType.windows)
  })

  const unsupportedPlatforms = [
    'aix',
    'android',
    'darwin',
    'freebsd',
    'haiku',
    'openbsd',
    'sunos',
    'cygwin',
    'netbsd',
  ]

  unsupportedPlatforms.forEach((platform) => {
    it(`should throw error for unsupported OS: ${platform}`, async () => {
      vi.mocked(os.platform).mockReturnValue(platform as unknown as ReturnType<typeof os.platform>)
      await expect(getOs()).rejects.toThrow(`Unsupported OS: ${platform}`)
    })
  })

  it('should return OS release version', async () => {
    const mockRelease = '22.04'
    vi.mocked(os.release).mockReturnValue(mockRelease)
    const version = await getRelease()
    expect(version).toBe(mockRelease)
  })
})
