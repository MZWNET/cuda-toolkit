import type { SemVer } from 'semver'
import linuxLinks from '@/scripts/update-links/linux-links.json' with { type: 'json' }
import { CPUArch, getArch } from '@/src/arch.js'
import { AbstractLinks } from '@/src/links/links.js'

interface LinuxLinksModel {
  local: {
    x86_64: Record<string, string>
    arm64?: Record<string, string>
  }
}

/**
 * Singleton class for linux links.
 */
export class LinuxLinks extends AbstractLinks {
  // Singleton instance
  private static _instance: LinuxLinks
  private cudaVersionToArm64URL: Map<string, string>

  // Private constructor to prevent instantiation
  private constructor() {
    super()
    // Map of cuda SemVer version to download URL
    const model = linuxLinks as unknown as LinuxLinksModel
    this.cudaVersionToURL = new Map(Object.entries(model.local.x86_64))
    this.cudaVersionToArm64URL = new Map(Object.entries(model.local.arm64 ?? {}))
  }

  async getLocalURLFromCudaVersion(version: SemVer): Promise<URL> {
    const arch: CPUArch = await getArch()
    if (arch === CPUArch.arm64) {
      const urlString = this.cudaVersionToArm64URL.get(`${version.toString()}`)
      if (urlString === undefined) {
        throw new Error(`CUDA Toolkit ${version.toString()} does not support ARM64 downloads`)
      }
      return new URL(urlString)
    }
    return super.getLocalURLFromCudaVersion(version)
  }

  static get Instance(): LinuxLinks {
    return this._instance ?? (this._instance = new this())
  }
}
