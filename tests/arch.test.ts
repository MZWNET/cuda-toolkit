import os from 'node:os'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CPUArch, getArch } from '../src/arch.js'

vi.mock('node:os', () => ({
  default: {
    arch: vi.fn(),
  },
}))

describe('arch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect x86_64 architecture', async () => {
    vi.mocked(os.arch).mockReturnValue('x64')
    const detectedArch = await getArch()
    expect(detectedArch).toBe(CPUArch.x86_64)
  })

  it('should detect arm64 architecture', async () => {
    vi.mocked(os.arch).mockReturnValue('arm64')
    const detectedArch = await getArch()
    expect(detectedArch).toBe(CPUArch.arm64)
  })

  const unsupportedArches = [
    'arm',
    'ia32',
    'loong64',
    'mips',
    'mipsel',
    'ppc64',
    'riscv64',
    's390x',
  ]

  unsupportedArches.forEach((archString) => {
    it(`should throw error for unsupported architecture: ${archString}`, async () => {
      vi.mocked(os.arch).mockReturnValue(archString as unknown as ReturnType<typeof os.arch>)
      await expect(getArch()).rejects.toThrow(`Unsupported architecture: ${archString}`)
    })
  })
})
