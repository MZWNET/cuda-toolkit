import os from 'node:os'
import { debug } from '@actions/core'

export enum OSType {
  windows = 'windows',
  linux = 'linux',
}

export async function getOs(): Promise<OSType> {
  const osPlatform = os.platform()
  switch (osPlatform) {
    case 'win32':
      return OSType.windows
    case 'linux':
      return OSType.linux
    case 'aix':
    case 'android':
    case 'darwin':
    case 'freebsd':
    case 'haiku':
    case 'openbsd':
    case 'sunos':
    case 'cygwin':
    case 'netbsd':
      debug(`Unsupported OS: ${osPlatform}`)
      throw new Error(`Unsupported OS: ${osPlatform}`)
  }
}

export async function getRelease(): Promise<string> {
  return os.release()
}
