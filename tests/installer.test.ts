import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { SemVer } from 'semver'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterReadable } from '../src/fs-utils.js'
import { install } from '../src/installer.js'
import { getOs, getRelease, OSType } from '../src/platform.js'

vi.mock('@actions/artifact', () => {
  const DefaultArtifactClientMock = vi.fn()
  ;(DefaultArtifactClientMock.prototype as { uploadArtifact: unknown }).uploadArtifact = vi.fn().mockResolvedValue({ id: 123 })
  return {
    DefaultArtifactClient: DefaultArtifactClientMock,
  }
})

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('@actions/exec', () => ({
  exec: vi.fn().mockResolvedValue(0),
}))

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    userInfo: vi.fn().mockReturnValue({ username: 'testuser' }),
  }
})

vi.mock('../src/platform.js', () => ({
  getOs: vi.fn(),
  getRelease: vi.fn(),
  OSType: {
    windows: 'windows',
    linux: 'linux',
  },
}))

vi.mock('../src/fs-utils.js', () => ({
  filterReadable: vi.fn(),
}))

describe('installer', () => {
  const executablePath = '/path/to/installer'
  const version = new SemVer('12.1.0')
  const method = 'local'
  const logFileSuffix = 'local-linux'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRelease).mockResolvedValue('22.04')
  })

  describe('install', () => {
    it('should run installer on Linux with sudo and upload log file', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(filterReadable).mockResolvedValue(['/var/log/cuda-installer.log'])
      const linuxLocalArgsArray = ['--toolkit']

      await install(executablePath, version, [], linuxLocalArgsArray, method, logFileSuffix)

      expect(exec).toHaveBeenCalledWith(`sudo ${executablePath}`, ['--silent', '--toolkit'], expect.any(Object))

      // Log upload permissions fixing
      expect(exec).toHaveBeenCalledWith(`sudo chmod 644 /var/log/cuda-installer.log`)
      expect(exec).toHaveBeenCalledWith(`sudo chown testuser /var/log/cuda-installer.log`)

      // Log upload invocation
      expect(DefaultArtifactClient).toHaveBeenCalled()
      const mockedClient = vi.mocked(DefaultArtifactClient)
      const clientInstance = (mockedClient.mock.results[0]?.value ?? mockedClient.mock.instances[0]) as { uploadArtifact: import('vitest').Mock }
      expect(clientInstance.uploadArtifact).toHaveBeenCalledWith(
        `cuda-install-linux-22.04-local-local-linux`,
        ['/var/log/cuda-installer.log'],
        '/var/log',
      )
    })

    it('should run installer on Linux but gracefully handle no log file readable', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(filterReadable).mockResolvedValue([])
      const linuxLocalArgsArray = ['--toolkit']

      await install(executablePath, version, [], linuxLocalArgsArray, method, logFileSuffix)

      expect(exec).toHaveBeenCalledWith(`sudo ${executablePath}`, ['--silent', '--toolkit'], expect.any(Object))

      expect(DefaultArtifactClient).not.toHaveBeenCalled()
      expect(core.debug).toHaveBeenCalledWith('No log file to upload')
    })

    it('should run installer on Windows and append versioned subpackages', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.windows)
      const subPackagesArray = ['nvcc', 'Display.Driver']
      const linuxLocalArgsArray: string[] = []

      await install(executablePath, version, subPackagesArray, linuxLocalArgsArray, method, logFileSuffix)

      // Expected args: -s, nvcc_12.1, Display.Driver
      expect(exec).toHaveBeenCalledWith(`${executablePath}`, ['-s', 'nvcc_12.1', 'Display.Driver'], expect.any(Object))

      // Should not upload logs on windows
      expect(DefaultArtifactClient).not.toHaveBeenCalled()
    })

    it('should throw error if execution fails but still try upload on linux', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(filterReadable).mockResolvedValue(['/var/log/cuda-installer.log'])
      const linuxLocalArgsArray = ['--toolkit']

      const executionError = new Error('Execution Failed')
      vi.mocked(exec).mockRejectedValueOnce(executionError)

      await expect(install(executablePath, version, [], linuxLocalArgsArray, method, logFileSuffix)).rejects.toThrow('Execution Failed')

      expect(core.warning).toHaveBeenCalledWith(`Error during installation: Error: Execution Failed`)

      // Log upload still runs in finally block
      expect(DefaultArtifactClient).toHaveBeenCalled()
      const mockedClient = vi.mocked(DefaultArtifactClient)
      const clientInstance = (mockedClient.mock.results[0]?.value ?? mockedClient.mock.instances[0]) as { uploadArtifact: import('vitest').Mock }
      expect(clientInstance.uploadArtifact).toHaveBeenCalledWith(
        `cuda-install-linux-22.04-local-local-linux`,
        ['/var/log/cuda-installer.log'],
        '/var/log',
      )
    })
  })
})
