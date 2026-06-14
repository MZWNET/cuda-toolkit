import type { CudaLinksModel } from '@/src/links/links.js'
import { SemVer } from 'semver'
import windowsLinks from '@/scripts/update-links/windows-links.json' with { type: 'json' }
import { AbstractLinks } from '@/src/links/links.js'

const windowsLinksModel = windowsLinks as unknown as CudaLinksModel
const cudaVersionToLocalData = windowsLinksModel.local.x86_64
const cudaVersionToNetworkData = windowsLinksModel.network?.x86_64 ?? {}

/**
 * Singleton class for windows links.
 */
export class WindowsLinks extends AbstractLinks {
  // Singleton instance
  private static _instance: WindowsLinks

  private cudaVersionToNetworkUrl: Map<string, string>

  // Private constructor to prevent instantiation
  private constructor() {
    super()
    // Map of cuda SemVer version to download URL
    this.cudaVersionToURL = new Map(Object.entries(cudaVersionToLocalData))
    this.cudaVersionToNetworkUrl = new Map(Object.entries(cudaVersionToNetworkData))
  }

  static get Instance(): WindowsLinks {
    return this._instance ?? (this._instance = new this())
  }

  getAvailableNetworkCudaVersions(): SemVer[] {
    return Array.from(this.cudaVersionToNetworkUrl.keys(), s => new SemVer(s))
  }

  getNetworkURLFromCudaVersion(version: SemVer): URL {
    const urlString = this.cudaVersionToNetworkUrl.get(`${version.toString()}`)
    if (urlString === undefined) {
      throw new Error(`Invalid version: ${version.toString()}`)
    }
    return new URL(urlString)
  }
}
