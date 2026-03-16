import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SemVer } from 'semver'
import { vi } from 'vitest'
import { CPUArch, getArch } from '@/fixtures/arch.js'
import { LinuxLinks } from '@/src/links/linux-links.js'

vi.mock('@/src/arch.js', async () => import('@/fixtures/arch.js'))

const linuxLinksJsonPath = resolve('src/links/linux-links.json')
const linuxLinksData = JSON.parse(readFileSync(linuxLinksJsonPath, 'utf8')) as {
  local: {
    x86_64: Record<string, string>
    arm64?: Record<string, string>
  }
}

const arm64Versions = Object.keys(linuxLinksData.local.arm64 ?? {})
const x86Versions = Object.keys(linuxLinksData.local.x86_64)
const x86OnlyVersions = x86Versions.filter(version => !arm64Versions.includes(version))

it('linux Cuda versions in descending order', async () => {
  vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
  const versions = LinuxLinks.Instance.getAvailableLocalCudaVersions()
  for (let i = 0; i < versions.length - 1; i++) {
    const versionA: SemVer = versions[i]
    const versionB: SemVer = versions[i + 1]
    expect(versionA.compare(versionB)).toBe(1) // A should be greater than B
  }
})

it(
  'linux Cuda version to URL map contains valid URLs',
  async () => {
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    for (const version of LinuxLinks.Instance.getAvailableLocalCudaVersions()) {
      const url: URL = await LinuxLinks.Instance.getLocalURLFromCudaVersion(version)
      expect(url).toBeInstanceOf(URL)
    }
  },
)

it('there is at least linux 1 version url pair', async () => {
  vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
  expect(
    LinuxLinks.Instance.getAvailableLocalCudaVersions().length,
  ).toBeGreaterThanOrEqual(1)
})

it(
  'local Linux links should start with https://developer.(download.)nvidia.com and end with a known Linux installer suffix',
  async () => {
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    const versions = LinuxLinks.Instance.getAvailableLocalCudaVersions()
    const filteredVersions = versions.filter((version) => {
      return (
        version.version !== '10.0.130'
        && version.version !== '9.2.148'
        && version.version !== '8.0.61'
      )
    })
    for (const version of filteredVersions) {
      const url: URL = await LinuxLinks.Instance.getLocalURLFromCudaVersion(version)
      expect(url.toString()).toMatch(
        /^https:\/\/developer\.(download\.)?nvidia\.com.+(\.run|-run|_linux)$/,
      )
    }
  },
)

it('linux arm64 versions resolve to URLs when available', async () => {
  vi.mocked(getArch).mockResolvedValue(CPUArch.arm64)
  for (const versionString of arm64Versions) {
    const url = await LinuxLinks.Instance.getLocalURLFromCudaVersion(
      new SemVer(versionString),
    )
    expect(url).toBeInstanceOf(URL)
  }
})

it('linux arm64 throws on x86_64-only versions', async () => {
  vi.mocked(getArch).mockResolvedValue(CPUArch.arm64)
  const [sampleVersion] = x86OnlyVersions
  if (sampleVersion === undefined) {
    return
  }
  await expect(
    LinuxLinks.Instance.getLocalURLFromCudaVersion(
      new SemVer(sampleVersion),
    ),
  ).rejects.toThrow('does not support ARM64 downloads')
})
