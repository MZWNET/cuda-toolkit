import type { ArchiveEntry } from './types.js'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fetchArchiveVersions } from './archive.js'
import { LINUX_LINKS_PATH, WINDOWS_LINKS_PATH } from './constants.js'
import { fetchDownloadLinks } from './releases.js'

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let nextIndex = 0

  const runWorker = async () => {
    while (true) {
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length)
        break
      results[current] = await worker(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }).fill(runWorker())
  await Promise.all(workers)
  return results
}

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
  const versions = archiveEntries.map((entry: ArchiveEntry) => entry.label)
  console.log(`Resolved CUDA Toolkit versions: ${versions.join(', ')}`)

  const linuxLinks: { local: Record<string, string> } = { local: {} }
  const windowsLinks: { local: Record<string, string>, network: Record<string, string> } = { local: {}, network: {} }

  const argConcurrency = parseConcurrencyArg(process.argv.slice(2))
  const concurrency = Math.max(1, argConcurrency ?? 4)

  const results = await mapWithConcurrency(archiveEntries, concurrency, async (entry) => {
    const { version: resolvedVersion, linuxUrl, windowsLocalUrl, windowsNetworkUrl } = await fetchDownloadLinks(entry.url)
    console.log(`Parsed CUDA Toolkit ${resolvedVersion} complete`)
    return { version: resolvedVersion, linuxUrl, windowsLocalUrl, windowsNetworkUrl }
  })

  for (const result of results) {
    linuxLinks.local[result.version] = result.linuxUrl
    windowsLinks.local[result.version] = result.windowsLocalUrl
    windowsLinks.network[result.version] = result.windowsNetworkUrl
  }

  await writeFile(LINUX_LINKS_PATH, `${JSON.stringify(linuxLinks, null, 2)}\n`, 'utf8')
  await writeFile(WINDOWS_LINKS_PATH, `${JSON.stringify(windowsLinks, null, 2)}\n`, 'utf8')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
