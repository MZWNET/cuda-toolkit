export interface ReleaseEntry {
  details?: string
}

export interface PageData {
  pageData?: {
    header?: { title?: string }
    releases?: Record<string, ReleaseEntry>
  }
}

export interface DownloadLinks {
  version: string
  linuxUrl: string
  linuxArm64Url: string | null
  windowsLocalUrl: string
  windowsNetworkUrl: string
}
