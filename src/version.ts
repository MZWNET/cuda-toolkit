import type { AbstractLinks } from '@/src/links/links.js'
import type { Method } from '@/src/method.js'
import * as core from '@actions/core'
import { SemVer } from 'semver'
import { getLinks } from '@/src/links/get-links.js'

// Helper for converting string to SemVer and verifying it exists in the links
export async function getVersion(versionString: string, method: Method): Promise<SemVer> {
  const version = new SemVer(versionString)
  const links: AbstractLinks = await getLinks()
  const versions = await links.getAvailableCudaVersions(method)
  core.debug(`Available versions: ${versions.map(v => v.toString()).join(', ')}`)
  if (versions.some(v => v.compare(version) === 0)) {
    core.debug(`Version available: ${version.toString()}`)
    return version
  } else {
    core.debug(`Version not available error!`)
    throw new Error(`Version not available: ${version.toString()}`)
  }
}
