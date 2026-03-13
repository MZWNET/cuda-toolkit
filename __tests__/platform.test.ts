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
    default:
      // eslint-disable-next-line jest/no-conditional-expect
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
