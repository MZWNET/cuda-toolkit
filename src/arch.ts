import os from 'node:os'
import { debug } from '@actions/core'

export enum CPUArch {
  x86_64 = 'x64',
  arm64 = 'arm64',
}

export async function getArch(): Promise<CPUArch> {
  const arch = os.arch()
  switch (arch) {
    case 'x64':
      return CPUArch.x86_64
    case 'arm64':
      return CPUArch.arm64
    case 'arm':
    case 'ia32':
    case 'loong64':
    case 'mips':
    case 'mipsel':
    case 'ppc64':
    case 'riscv64':
    case 's390x':
      debug(`Unsupported architecture: ${arch}`)
      throw new Error(`Unsupported architecture: ${arch}`)
  }
}
