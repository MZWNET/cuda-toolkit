import { vi } from 'vitest'

export enum OSType {
  windows = 'windows',
  linux = 'linux',
}

export const getOs = vi.fn()
