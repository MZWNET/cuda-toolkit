export interface ReleaseEntry {
  details?: string
}

export interface PageData {
  pageData?: {
    header?: { title?: string }
    releases?: Record<string, ReleaseEntry>
  }
}

export interface ArchiveEntry {
  url: string
  label: string
  baseVersion: string | null
}

export interface DownloadLinks {
  version: string
  linuxUrl: string
  linuxArm64Url: string | null
  windowsLocalUrl: string
  windowsNetworkUrl: string
}

export interface LegacyDownloadLinks {
  linuxUrl: string
  linuxArm64Url: string | null
  windowsLocalUrl: string
  windowsNetworkUrl: string
}
