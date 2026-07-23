import type { CudaVersionUrlMap, LinkArchitecture } from '@/src/links/links.js'
import type { Method } from '@/src/method.js'
import type { SemVer } from 'semver'
import linuxLinks from '@/scripts/update-links/linux-links.json' with { type: 'json' }
import { getArch } from '@/src/arch.js'
import { AbstractLinks, getLinkArchitecture } from '@/src/links/links.js'

type PreviewNetworkMap = Record<string, Record<string, string>>

interface LinuxLinksModel {
  local: Record<LinkArchitecture, CudaVersionUrlMap>
  network: Record<LinkArchitecture, PreviewNetworkMap>
}

const model = linuxLinks as unknown as LinuxLinksModel

export class LinuxLinks extends AbstractLinks {
  private static _instance: LinuxLinks

  private getLocalMap(arch: LinkArchitecture): CudaVersionUrlMap {
    return model.local[arch] ?? {}
  }

  private getNetworkMap(arch: LinkArchitecture): PreviewNetworkMap {
    return model.network?.[arch] ?? {}
  }

  async getAvailableCudaVersions(method: Method): Promise<SemVer[]> {
    const arch = getLinkArchitecture(await getArch())
    const local = this.getLocalMap(arch)
    if (method === 'local') return this.getVersions(local)

    const versions = new Set([...Object.keys(local), ...Object.keys(this.getNetworkMap(arch))])
    return this.getVersions(Object.fromEntries(Array.from(versions, version => [version, ''])))
  }

  async getLocalURLFromCudaVersion(version: SemVer): Promise<URL> {
    const arch = getLinkArchitecture(await getArch())
    return this.getUrl(this.getLocalMap(arch), version)
  }

  async getNetworkKeyringURL(version: SemVer, ubuntuVersion: string): Promise<URL | null> {
    const arch = getLinkArchitecture(await getArch())
    const versionData = this.getNetworkMap(arch)[version.toString()]
    if (versionData === undefined) return null

    const url = versionData[ubuntuVersion]
    if (url === undefined) throw new Error(`Version not available: ${version.toString()}`)
    return new URL(url)
  }

  static get Instance(): LinuxLinks {
    return this._instance ?? (this._instance = new this())
  }
}
