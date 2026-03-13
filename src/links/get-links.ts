import type { AbstractLinks } from './links.js'
import { getOs, OSType } from '../platform.js'
import { LinuxLinks } from './linux-links.js'
import { WindowsLinks } from './windows-links.js'

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
