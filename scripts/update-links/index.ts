import type { ArchiveEntry } from './archive.js'
import type { DownloadLinks } from './releases.js'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { rcompare } from 'semver'
import { fetchArchiveVersions } from './archive.js'
import { LINUX_LINKS_PATH, WINDOWS_LINKS_PATH } from './constants.js'
import { fetchDownloadLinks } from './releases.js'
import { mapWithConcurrency } from './utils/concurrency.js'

type VersionUrlMap = Record<string, string>
type PreviewNetworkMap = Record<string, Record<string, string>>

export interface LinuxLinksOutput {
  local: { x86_64: VersionUrlMap; arm64: VersionUrlMap }
  network: { x86_64: PreviewNetworkMap; arm64: PreviewNetworkMap }
}

export interface WindowsLinksOutput {
  local: { x86_64: VersionUrlMap; arm64: VersionUrlMap }
  network: { x86_64: VersionUrlMap; arm64: VersionUrlMap }
}

function parseConcurrencyArg(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--concurrency' || arg === '-c') {
      const value = argv[i + 1]
      if (value === undefined) return null
      const parsed = Number.parseInt(value, 10)
      return Number.isNaN(parsed) ? null : parsed
    }
    if (arg.startsWith('--concurrency=')) {
      const value = arg.split('=')[1] ?? ''
      const parsed = Number.parseInt(value, 10)
      return Number.isNaN(parsed) ? null : parsed
    }
  }
  return null
}

function selectPreferredReleases(results: DownloadLinks[]): DownloadLinks[] {
  const selected = new Map<string, DownloadLinks>()
  for (const result of results) {
    const current = selected.get(result.version)
    if (current === undefined || (current.channel === 'preview' && result.channel === 'stable')) {
      selected.set(result.version, result)
    }
  }
  return Array.from(selected.values()).sort((a, b) => rcompare(a.version, b.version))
}

export function buildLinkModels(results: DownloadLinks[]): {
  linuxLinks: LinuxLinksOutput
  windowsLinks: WindowsLinksOutput
} {
  const linuxLinks: LinuxLinksOutput = {
    local: { x86_64: {}, arm64: {} },
    network: { x86_64: {}, arm64: {} },
  }
  const windowsLinks: WindowsLinksOutput = {
    local: { x86_64: {}, arm64: {} },
    network: { x86_64: {}, arm64: {} },
  }

  for (const result of selectPreferredReleases(results)) {
    if (result.linuxLocal.x86_64 !== null) linuxLinks.local.x86_64[result.version] = result.linuxLocal.x86_64
    if (result.linuxLocal.arm64 !== null) linuxLinks.local.arm64[result.version] = result.linuxLocal.arm64
    if (Object.keys(result.linuxNetwork.x86_64).length > 0)
      linuxLinks.network.x86_64[result.version] = result.linuxNetwork.x86_64
    if (Object.keys(result.linuxNetwork.arm64).length > 0)
      linuxLinks.network.arm64[result.version] = result.linuxNetwork.arm64
    if (result.windowsLocal.x86_64 !== null) windowsLinks.local.x86_64[result.version] = result.windowsLocal.x86_64
    if (result.windowsLocal.arm64 !== null) windowsLinks.local.arm64[result.version] = result.windowsLocal.arm64
    if (result.windowsNetwork.x86_64 !== null)
      windowsLinks.network.x86_64[result.version] = result.windowsNetwork.x86_64
    if (result.windowsNetwork.arm64 !== null) windowsLinks.network.arm64[result.version] = result.windowsNetwork.arm64
  }

  return { linuxLinks, windowsLinks }
}

export async function main(): Promise<void> {
  const archiveEntries = await fetchArchiveVersions()
  const versions = archiveEntries.map((entry: ArchiveEntry) => entry.version)
  console.log(`Resolved versions: ${versions.join(', ')}`)

  const argConcurrency = parseConcurrencyArg(process.argv.slice(2))
  const concurrency = Math.max(1, argConcurrency ?? 4)
  const results = await mapWithConcurrency(archiveEntries, concurrency, async entry =>
    fetchDownloadLinks(entry.url, entry.channel),
  )
  const { linuxLinks, windowsLinks } = buildLinkModels(results)

  await writeFile(LINUX_LINKS_PATH, `${JSON.stringify(linuxLinks, null, 2)}\n`, 'utf8')
  await writeFile(WINDOWS_LINKS_PATH, `${JSON.stringify(windowsLinks, null, 2)}\n`, 'utf8')
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
