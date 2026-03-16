import type { AbstractLinks } from '@/src/links/links.js'
import { LinuxLinks } from '@/src/links/linux-links.js'
import { WindowsLinks } from '@/src/links/windows-links.js'
import { getOs, OSType } from '@/src/platform.js'

// Platform independent getter for ILinks interface
export async function getLinks(): Promise<AbstractLinks> {
  const osType = await getOs()
  switch (osType) {
    case OSType.windows:
      return WindowsLinks.Instance
    case OSType.linux:
      return LinuxLinks.Instance
  }
}
