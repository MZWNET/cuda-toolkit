import type { CudaLinksModel, CudaVersionUrlMap, LinkArchitecture } from '@/src/links/links.js'
import type { Method } from '@/src/method.js'
import type { SemVer } from 'semver'
import windowsLinks from '@/scripts/update-links/windows-links.json' with { type: 'json' }
import { getArch } from '@/src/arch.js'
import { AbstractLinks, getLinkArchitecture } from '@/src/links/links.js'

const model = windowsLinks as unknown as CudaLinksModel

export class WindowsLinks extends AbstractLinks {
  private static _instance: WindowsLinks

  private getMap(method: Method, arch: LinkArchitecture): CudaVersionUrlMap {
    return model[method]?.[arch] ?? {}
  }

  async getAvailableCudaVersions(method: Method): Promise<SemVer[]> {
    const arch = getLinkArchitecture(await getArch())
    return this.getVersions(this.getMap(method, arch))
  }

  async getLocalURLFromCudaVersion(version: SemVer): Promise<URL> {
    const arch = getLinkArchitecture(await getArch())
    return this.getUrl(this.getMap('local', arch), version)
  }

  async getNetworkURLFromCudaVersion(version: SemVer): Promise<URL> {
    const arch = getLinkArchitecture(await getArch())
    return this.getUrl(this.getMap('network', arch), version)
  }

  static get Instance(): WindowsLinks {
    return this._instance ?? (this._instance = new this())
  }
}
