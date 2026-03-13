import os from 'node:os'
import { getOs, getRelease, OSType } from '../src/platform.js'

it.concurrent('return either windows of linux platform', async () => {
  const osString = os.platform()
  let expected: OSType
  switch (osString) {
    case 'win32':
      expected = OSType.windows
      break
    case 'linux':
      expected = OSType.linux
      break
    case 'aix':
    case 'android':
    case 'darwin':
    case 'freebsd':
    case 'haiku':
    case 'openbsd':
    case 'sunos':
    case 'cygwin':
    case 'netbsd':
      await expect(getOs()).rejects.toThrow(`Unsupported OS: ${osString}`)
      return
  }
  const osPlatform = await getOs()
  expect(osPlatform).toBe(expected)
})

it.concurrent('return version', async () => {
  const version = await getRelease()
  expect(version).toBeDefined()
})
