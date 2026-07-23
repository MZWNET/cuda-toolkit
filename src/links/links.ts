import type { Method } from '@/src/method.js'
import { SemVer } from 'semver'
import { CPUArch } from '@/src/arch.js'

export type CudaVersionUrlMap = Record<string, string>
export type LinkArchitecture = 'x86_64' | 'arm64'

export interface CudaLinksModel {
  local: Record<LinkArchitecture, CudaVersionUrlMap>
  network: Record<LinkArchitecture, CudaVersionUrlMap>
}

export function getLinkArchitecture(arch: CPUArch): LinkArchitecture {
  return arch === CPUArch.arm64 ? 'arm64' : 'x86_64'
}

export abstract class AbstractLinks {
  abstract getAvailableCudaVersions(method: Method): Promise<SemVer[]>

  abstract getLocalURLFromCudaVersion(version: SemVer): Promise<URL>

  protected getVersions(map: CudaVersionUrlMap): SemVer[] {
    return Object.keys(map)
      .map(version => new SemVer(version))
      .sort((a, b) => b.compare(a))
  }

  protected getUrl(map: CudaVersionUrlMap, version: SemVer): URL {
    const urlString = map[version.toString()]
    if (urlString === undefined) {
      throw new Error(`Invalid version: ${version.toString()}`)
    }
    return new URL(urlString)
  }
}
