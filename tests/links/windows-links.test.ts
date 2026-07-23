import type { Method } from '@/src/method.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SemVer } from 'semver'
import { describe, expect, it, vi } from 'vitest'
import { CPUArch, getArch } from '@/fixtures/arch.js'
import { WindowsLinks } from '@/src/links/windows-links.js'

vi.mock('@/src/arch.js', async () => import('@/fixtures/arch.js'))

type Arch = 'x86_64' | 'arm64'

const windowsLinksJsonPath = resolve('scripts/update-links/windows-links.json')
const windowsLinksData = JSON.parse(readFileSync(windowsLinksJsonPath, 'utf8')) as {
  local: Record<Arch, Record<string, string>>
  network: Record<Arch, Record<string, string>>
}

const cases: Array<{ arch: Arch; cpuArch: CPUArch; method: Method }> = [
  { arch: 'x86_64', cpuArch: CPUArch.x86_64, method: 'local' },
  { arch: 'x86_64', cpuArch: CPUArch.x86_64, method: 'network' },
  { arch: 'arm64', cpuArch: CPUArch.arm64, method: 'local' },
  { arch: 'arm64', cpuArch: CPUArch.arm64, method: 'network' },
]

describe('windowsLinks', () => {
  it.each(cases)('reads only $arch $method availability and sorts it descending', async ({ arch, cpuArch, method }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)

    const actual = await WindowsLinks.Instance.getAvailableCudaVersions(method)
    const expected = Object.keys(windowsLinksData[method][arch])

    expect(actual.map(version => version.toString())).toEqual(expected)
    for (let i = 0; i < actual.length - 1; i += 1) {
      expect(actual[i].compare(actual[i + 1])).toBe(1)
    }
  })

  it.each([
    { arch: 'x86_64' as const, cpuArch: CPUArch.x86_64 },
    { arch: 'arm64' as const, cpuArch: CPUArch.arm64 },
  ])('resolves $arch local URLs', async ({ arch, cpuArch }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)
    for (const [version, expectedUrl] of Object.entries(windowsLinksData.local[arch])) {
      await expect(WindowsLinks.Instance.getLocalURLFromCudaVersion(new SemVer(version))).resolves.toEqual(
        new URL(expectedUrl),
      )
    }
  })

  it.each([
    { arch: 'x86_64' as const, cpuArch: CPUArch.x86_64 },
    { arch: 'arm64' as const, cpuArch: CPUArch.arm64 },
  ])('resolves $arch network URLs', async ({ arch, cpuArch }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)
    for (const [version, expectedUrl] of Object.entries(windowsLinksData.network[arch])) {
      await expect(WindowsLinks.Instance.getNetworkURLFromCudaVersion(new SemVer(version))).resolves.toEqual(
        new URL(expectedUrl),
      )
    }
  })

  it('does not expose a local-only version through the network mapping', async () => {
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    const networkVersions = new Set(Object.keys(windowsLinksData.network.x86_64))
    const localOnlyVersion = Object.keys(windowsLinksData.local.x86_64).find(version => !networkVersions.has(version))
    expect(localOnlyVersion).toBeDefined()

    await expect(WindowsLinks.Instance.getNetworkURLFromCudaVersion(new SemVer(localOnlyVersion!))).rejects.toThrow(
      `Invalid version: ${localOnlyVersion}`,
    )
  })
})
