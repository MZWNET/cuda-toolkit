import type { AbstractLinks } from '@/src/links/links.js'
import type { Method } from '@/src/method.js'
import { SemVer } from 'semver'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLinks } from '@/src/links/get-links.js'
import { getVersion } from '@/src/version.js'

vi.mock('@actions/core', async () => import('@/fixtures/core.js'))
vi.mock('@/src/links/get-links.js', () => ({ getLinks: vi.fn() }))

describe('getVersion', () => {
  const getAvailableCudaVersions = vi.fn()

  beforeEach(() => {
    getAvailableCudaVersions.mockResolvedValue([new SemVer('13.4.0'), new SemVer('11.2.2')])
    vi.mocked(getLinks).mockResolvedValue({
      getAvailableCudaVersions,
    } as unknown as AbstractLinks)
  })

  it.each<Method>(['local', 'network'])('checks availability in only the %s mapping', async method => {
    const version = await getVersion('11.2.2', method)

    expect(version).toEqual(new SemVer('11.2.2'))
    expect(getAvailableCudaVersions).toHaveBeenCalledWith(method)
  })

  it.each<Method>(['local', 'network'])('throws on an invalid version string for method %s', async method => {
    const versionString = 'invalid version string that does not conform to semver'
    await expect(getVersion(versionString, method)).rejects.toThrow(new TypeError(`Invalid Version: ${versionString}`))
  })

  it.each<Method>(['local', 'network'])('throws the existing unavailable error for method %s', async method => {
    await expect(getVersion('0.0.1', method)).rejects.toThrow('Version not available: 0.0.1')
  })
})
