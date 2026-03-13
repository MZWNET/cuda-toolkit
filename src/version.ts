import type { AbstractLinks } from './links/links.js'
import type { WindowsLinks } from './links/windows-links.js'
import type { Method } from './method.js'
import * as core from '@actions/core'
import { SemVer } from 'semver'
import { getLinks } from './links/get-links.js'
import { getOs, OSType } from './platform.js'

// Helper for converting string to SemVer and verifying it exists in the links
export async function getVersion(
  versionString: string,
  method: Method,
): Promise<SemVer> {
  const version = new SemVer(versionString)
  const links: AbstractLinks = await getLinks()
  let versions
  switch (method) {
    case 'local':
      versions = links.getAvailableLocalCudaVersions()
      break
    case 'network':
      switch (await getOs()) {
        case OSType.linux:
          // TODO adapt this to actual available network versions for linux
          versions = links.getAvailableLocalCudaVersions()
          break
        case OSType.windows:
          versions = (
            links as unknown as WindowsLinks
          ).getAvailableNetworkCudaVersions()
          break
      }
  }
  core.debug(`Available versions: ${versions}`)
  if (versions.some(v => v.compare(version) === 0)) {
    core.debug(`Version available: ${version}`)
    return version
  }
  else {
    core.debug(`Version not available error!`)
    throw new Error(`Version not available: ${version}`)
  }
}
