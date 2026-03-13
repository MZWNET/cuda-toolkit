import type { Method } from '../src/method.js'
import { SemVer } from 'semver'
import { vi } from 'vitest'
import { getVersion } from '../src/version.js'

vi.mock('node:os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:os')>()
  const isDarwin = mod.platform() === 'darwin'
  return {
    ...mod,
    default: {
      ...mod,
      platform: () => (isDarwin ? 'linux' : mod.platform()),
    },
    platform: () => (isDarwin ? 'linux' : mod.platform()),
  }
})

it.each<Method>(['local', 'network'])(
  'successfully parse correct version for method %s',
  async (method) => {
    const versionString = '11.2.2'
    try {
      const version = await getVersion(versionString, method)
      expect(version).toBeInstanceOf(SemVer)
      expect(version.compare(new SemVer(versionString))).toBe(0)
    }
    catch (error) {
      throw new Error(`Error parsing version: ${String(error)}`)
      // Other OS
    }
  },
)

it.each<Method>(['local', 'network'])(
  'expect error to be thrown on invalid version string for method %s',
  async (method) => {
    const versionString
      = 'invalid version string that does not conform to semver'
    await expect(getVersion(versionString, method)).rejects.toThrow(
      new TypeError(`Invalid Version: ${versionString}`),
    )
  },
)

it.each<Method>(['local', 'network'])(
  'expect error to be thrown on unavailable version for method %s',
  async (method) => {
    const versionString = '0.0.1'
    try {
      await expect(getVersion(versionString, method)).rejects.toThrow(
        `Version not available: ${versionString}`,
      )
    }
    catch (error) {
      throw new Error(`Error checking version availability: ${String(error)}`)
      // Other OS
    }
  },
)
