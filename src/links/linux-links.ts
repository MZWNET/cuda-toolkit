import type { SemVer } from 'semver'
import { CPUArch, getArch } from '../arch.js'
import { AbstractLinks } from './links.js'
import linuxLinks from './linux-links.json' with { type: 'json' }

/**
 * Singleton class for linux links.
 */
export class LinuxLinks extends AbstractLinks {
  // Singleton instance
  private static _instance: LinuxLinks

  // Private constructor to prevent instantiation
  private constructor() {
    super()
    // Map of cuda SemVer version to download URL
    this.cudaVersionToURL = new Map(Object.entries(linuxLinks.local as unknown as Record<string, string>))
  }

  async getLocalURLFromCudaVersion(version: SemVer): Promise<URL> {
    const link = await super.getLocalURLFromCudaVersion(version)
    const arch: CPUArch = await getArch()
    if (arch === CPUArch.arm64) {
      return new URL(link.toString().replace('_linux.run', '_linux_sbsa.run'))
    }
    else {
      return link
    }
  }

  static get Instance(): LinuxLinks {
    return this._instance ?? (this._instance = new this())
  }
}
