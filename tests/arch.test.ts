import os from 'node:os'
import { CPUArch, getArch } from '../src/arch.js'

it.concurrent('return either x64 or arm64 architecture', async () => {
  const archString = os.arch()
  let expected: CPUArch
  switch (archString) {
    case 'x64':
      expected = CPUArch.x86_64
      break
    case 'arm64':
      expected = CPUArch.arm64
      break
    case 'arm':
    case 'ia32':
    case 'loong64':
    case 'mips':
    case 'mipsel':
    case 'ppc64':
    case 'riscv64':
    case 's390x':
      await expect(getArch()).rejects.toThrow(
        `Unsupported architecture: ${archString}`,
      )
      return
  }

  const detectedArch = await getArch()
  expect(detectedArch).toBe(expected)
})
