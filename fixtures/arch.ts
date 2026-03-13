import { vi } from 'vitest'

export enum CPUArch {
  x86_64 = 'x64',
  arm64 = 'arm64',
}

export const getArch = vi.fn()
