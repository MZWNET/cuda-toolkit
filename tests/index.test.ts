import * as core from '@actions/core'
import { SemVer } from 'semver'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aptInstall, aptSetup, useApt } from '../src/apt-installer.js'
import { download } from '../src/downloader.js'
import { install } from '../src/installer.js'
import { parseMethod } from '../src/method.js'
import { parsePackages } from '../src/parser.js'
import { getOs, OSType } from '../src/platform.js'
import { updatePath } from '../src/update-path.js'
import { getVersion } from '../src/version.js'

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  getBooleanInput: vi.fn(),
  debug: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
}))

vi.mock('../src/downloader.js', () => ({ download: vi.fn() }))
vi.mock('../src/installer.js', () => ({ install: vi.fn() }))
vi.mock('../src/apt-installer.js', () => ({ aptInstall: vi.fn(), aptSetup: vi.fn(), useApt: vi.fn() }))
vi.mock('../src/parser.js', () => ({ parsePackages: vi.fn() }))
vi.mock('../src/method.js', () => ({ parseMethod: vi.fn() }))
vi.mock('../src/version.js', () => ({ getVersion: vi.fn() }))
vi.mock('../src/update-path.js', () => ({ updatePath: vi.fn() }))
vi.mock('../src/platform.js', () => ({
  getOs: vi.fn(),
  OSType: { linux: 'linux', windows: 'windows' },
}))

describe('index', () => {
  const mockCudaPath = '/mock/cuda/path'
  const mockVersion = new SemVer('12.1.0')
  const mockExecutablePath = '/mock/downloads/installer.run'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock returns
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'cuda')
        return '12.1.0'
      if (name === 'sub-packages')
        return '[]'
      if (name === 'non-cuda-sub-packages')
        return '[]'
      if (name === 'method')
        return 'local'
      if (name === 'linux-local-args')
        return '["--toolkit"]'
      if (name === 'log-file-suffix')
        return 'suffix'
      return ''
    })
    vi.mocked(core.getBooleanInput).mockReturnValue(true)

    vi.mocked(parsePackages).mockResolvedValue([])
    vi.mocked(parseMethod).mockReturnValue('local')
    vi.mocked(getVersion).mockResolvedValue(mockVersion)
    vi.mocked(getOs).mockResolvedValue(OSType.linux)
    vi.mocked(useApt).mockResolvedValue(false)
    vi.mocked(download).mockResolvedValue(mockExecutablePath)
    vi.mocked(updatePath).mockResolvedValue(mockCudaPath)
  })

  const runAction = async () => {
    vi.resetModules()
    const viUnknown = vi as unknown as Record<string, unknown>
    if ('isolateModulesAsync' in viUnknown && typeof viUnknown.isolateModulesAsync === 'function') {
      const isolateModulesAsync = viUnknown.isolateModulesAsync as (cb: () => Promise<void>) => Promise<void>
      await isolateModulesAsync(async () => {
        await import('../src/index.js')
        await new Promise(resolve => setTimeout(resolve, 0))
      })
    }
    else {
      await import('../src/index.js')
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  it('should run successful local installation on Linux', async () => {
    await runAction()

    expect(parsePackages).toHaveBeenCalledWith('[]', 'sub-packages')
    expect(parseMethod).toHaveBeenCalledWith('local')
    expect(getVersion).toHaveBeenCalledWith('12.1.0', 'local')

    expect(download).toHaveBeenCalledWith(mockVersion, 'local', true, true)
    expect(install).toHaveBeenCalledWith(mockExecutablePath, mockVersion, [], ['--toolkit'], 'local', 'suffix')

    expect(updatePath).toHaveBeenCalledWith(mockVersion)
    expect(core.setOutput).toHaveBeenCalledWith('cuda', '12.1.0')
    expect(core.setOutput).toHaveBeenCalledWith('CUDA_PATH', mockCudaPath)
  })

  it('should run successful network apt installation on Linux', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'method')
        return 'network'
      if (name === 'cuda')
        return '12.1.0'
      if (name === 'sub-packages')
        return '["nvcc"]'
      if (name === 'non-cuda-sub-packages')
        return '["libcublas"]'
      if (name === 'linux-local-args')
        return '[]'
      return 'suffix'
    })

    vi.mocked(parsePackages).mockImplementation(async val => JSON.parse(val) as string[])
    vi.mocked(parseMethod).mockReturnValue('network')
    vi.mocked(useApt).mockResolvedValue(true)

    await runAction()

    expect(aptSetup).toHaveBeenCalledWith(mockVersion)
    expect(aptInstall).toHaveBeenCalledWith(mockVersion, ['nvcc'], ['libcublas'])
    expect(download).not.toHaveBeenCalled()
    expect(install).not.toHaveBeenCalled()

    expect(updatePath).toHaveBeenCalledWith(mockVersion)
  })

  it('should handle json parsing error for linux-local-args', async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === 'linux-local-args')
        return 'invalid-json'
      return ''
    })

    await runAction()

    const args = vi.mocked(core.setFailed).mock.calls[0] as unknown as [Error]
    expect(args[0].message).toContain('JSON string array')
  })

  it('should fail if method is local and subPackages exist on Linux', async () => {
    vi.mocked(parsePackages).mockImplementation(async (val, key) => key === 'sub-packages' ? ['nvcc'] : [])

    await runAction()

    const args = vi.mocked(core.setFailed).mock.calls[0] as unknown as [Error]
    expect(args[0].message).toContain(`Subpackages on 'local' method is not supported on Linux`)
  })

  it('should gracefully setFailed on general thrown non-error', async () => {
    vi.mocked(getVersion).mockRejectedValue('String Error')

    await runAction()

    expect(core.setFailed).toHaveBeenCalledWith('Unknown error')
  })
})
