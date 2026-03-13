import type { CudaVersionUrlMap } from './links.js'
import { SemVer } from 'semver'
import { AbstractLinks } from './links.js'
import windowsLinks from './windows-links.json' with { type: 'json' }

const cudaVersionToLocalData: CudaVersionUrlMap = windowsLinks.local
const cudaVersionToNetworkData: CudaVersionUrlMap = windowsLinks.network

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
