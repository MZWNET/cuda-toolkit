import type { Method } from '@/src/method.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SemVer } from 'semver'
import { describe, expect, it, vi } from 'vitest'
import { CPUArch, getArch } from '@/fixtures/arch.js'
import { LinuxLinks } from '@/src/links/linux-links.js'

vi.mock('@/src/arch.js', async () => import('@/fixtures/arch.js'))

type Arch = 'x86_64' | 'arm64'
type NetworkMap = Record<string, Record<string, string>>

const linuxLinksJsonPath = resolve('scripts/update-links/linux-links.json')
const linuxLinksData = JSON.parse(readFileSync(linuxLinksJsonPath, 'utf8')) as {
  local: Record<Arch, Record<string, string>>
  network: Record<Arch, NetworkMap>
}

const cases: Array<{ arch: Arch; cpuArch: CPUArch; method: Method }> = [
  { arch: 'x86_64', cpuArch: CPUArch.x86_64, method: 'local' },
  { arch: 'x86_64', cpuArch: CPUArch.x86_64, method: 'network' },
  { arch: 'arm64', cpuArch: CPUArch.arm64, method: 'local' },
  { arch: 'arm64', cpuArch: CPUArch.arm64, method: 'network' },
]

function expectedVersions(arch: Arch, method: Method): string[] {
  const versions =
    method === 'local'
      ? Object.keys(linuxLinksData.local[arch])
      : [...Object.keys(linuxLinksData.local[arch]), ...Object.keys(linuxLinksData.network[arch])]
  return Array.from(new Set(versions)).sort((a, b) => new SemVer(b).compare(new SemVer(a)))
}

describe('linuxLinks', () => {
  it.each(cases)('reads only $arch $method availability and sorts it descending', async ({ arch, cpuArch, method }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)

    const actual = await LinuxLinks.Instance.getAvailableCudaVersions(method)

    expect(actual.map(version => version.toString())).toEqual(expectedVersions(arch, method))
  })

  it.each([
    { arch: 'x86_64' as const, cpuArch: CPUArch.x86_64 },
    { arch: 'arm64' as const, cpuArch: CPUArch.arm64 },
  ])('resolves $arch local URLs', async ({ arch, cpuArch }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)
    for (const [version, expectedUrl] of Object.entries(linuxLinksData.local[arch])) {
      await expect(LinuxLinks.Instance.getLocalURLFromCudaVersion(new SemVer(version))).resolves.toEqual(
        new URL(expectedUrl),
      )
    }
  })

  it('does not resolve an x86_64-only local version on ARM64', async () => {
    const arm64Versions = new Set(Object.keys(linuxLinksData.local.arm64))
    const version = Object.keys(linuxLinksData.local.x86_64).find(candidate => !arm64Versions.has(candidate))
    expect(version).toBeDefined()
    vi.mocked(getArch).mockResolvedValue(CPUArch.arm64)

    await expect(LinuxLinks.Instance.getLocalURLFromCudaVersion(new SemVer(version!))).rejects.toThrow(
      `Invalid version: ${version}`,
    )
  })

  it.each([
    { arch: 'x86_64' as const, cpuArch: CPUArch.x86_64 },
    { arch: 'arm64' as const, cpuArch: CPUArch.arm64 },
  ])('resolves $arch preview keyrings by Ubuntu version', async ({ arch, cpuArch }) => {
    vi.mocked(getArch).mockResolvedValue(cpuArch)
    for (const [version, ubuntuLinks] of Object.entries(linuxLinksData.network[arch])) {
      for (const [ubuntuVersion, expectedUrl] of Object.entries(ubuntuLinks)) {
        await expect(LinuxLinks.Instance.getNetworkKeyringURL(new SemVer(version), ubuntuVersion)).resolves.toEqual(
          new URL(expectedUrl),
        )
      }
    }
  })

  it('returns null for a stable network version without an explicit keyring', async () => {
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    const stableVersion = Object.keys(linuxLinksData.local.x86_64).find(
      version => linuxLinksData.network.x86_64[version] === undefined,
    )
    expect(stableVersion).toBeDefined()

    await expect(LinuxLinks.Instance.getNetworkKeyringURL(new SemVer(stableVersion!), '24.04')).resolves.toBeNull()
  })

  it('uses the existing unavailable error for an unmapped preview Ubuntu version', async () => {
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    const previewVersion = Object.keys(linuxLinksData.network.x86_64)[0]
    expect(previewVersion).toBeDefined()

    await expect(LinuxLinks.Instance.getNetworkKeyringURL(new SemVer(previewVersion), '20.04')).rejects.toThrow(
      `Version not available: ${previewVersion}`,
    )
  })
})
