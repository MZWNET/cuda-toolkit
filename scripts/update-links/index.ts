import type { ArchiveEntry } from './types.js'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fetchArchiveVersions } from './archive.js'
import { LINUX_LINKS_PATH, WINDOWS_LINKS_PATH } from './constants.js'
import { fetchDownloadLinks } from './releases.js'
import { mapWithConcurrency } from './utils/concurrency.js'

const CUDA_TOOLKIT_PREFIX_REGEX = /^CUDA Toolkit\s*/i

function parseConcurrencyArg(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--concurrency' || arg === '-c') {
      const value = argv[i + 1]
      if (value === undefined)
        return null
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

async function main() {
  const archiveEntries = await fetchArchiveVersions()
  const versions = archiveEntries.map((entry: ArchiveEntry) => entry.label.replace(CUDA_TOOLKIT_PREFIX_REGEX, ''))
  console.log(`Resolved versions: ${versions.join(', ')}`)

  const linuxLinks: { local: { x86_64: Record<string, string>, arm64: Record<string, string> } } = {
    local: { x86_64: {}, arm64: {} },
  }
  const windowsLinks: { local: { x86_64: Record<string, string> }, network: { x86_64: Record<string, string> } } = {
    local: { x86_64: {} },
    network: { x86_64: {} },
  }

  const argConcurrency = parseConcurrencyArg(process.argv.slice(2))
  const concurrency = Math.max(1, argConcurrency ?? 4)

  const results = await mapWithConcurrency(archiveEntries, concurrency, async (entry) => {
    const { version: resolvedVersion, linuxUrl, linuxArm64Url, windowsLocalUrl, windowsNetworkUrl } = await fetchDownloadLinks(entry.url)
    return { version: resolvedVersion, linuxUrl, linuxArm64Url, windowsLocalUrl, windowsNetworkUrl }
  })

  for (const result of results) {
    linuxLinks.local.x86_64[result.version] = result.linuxUrl
    if (result.linuxArm64Url !== null) {
      linuxLinks.local.arm64[result.version] = result.linuxArm64Url
    }
    windowsLinks.local.x86_64[result.version] = result.windowsLocalUrl
    windowsLinks.network.x86_64[result.version] = result.windowsNetworkUrl
  }

  await writeFile(LINUX_LINKS_PATH, `${JSON.stringify(linuxLinks, null, 2)}\n`, 'utf8')
  await writeFile(WINDOWS_LINKS_PATH, `${JSON.stringify(windowsLinks, null, 2)}\n`, 'utf8')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
