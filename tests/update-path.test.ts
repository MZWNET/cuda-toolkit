import path from 'node:path'
import * as core from '@actions/core'
import { SemVer } from 'semver'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOs, OSType } from '../src/platform.js'
import { updatePath } from '../src/update-path.js'

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  exportVariable: vi.fn(),
  addPath: vi.fn(),
}))

vi.mock('../src/platform.js', () => ({
  getOs: vi.fn(),
  OSType: {
    windows: 'windows',
    linux: 'linux',
  },
}))

describe('update-path', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should update paths correctly on Linux', async () => {
    vi.mocked(getOs).mockResolvedValue(OSType.linux)
    // Setup initial LD_LIBRARY_PATH
    process.env.LD_LIBRARY_PATH = '/some/existing/lib'

    const version = new SemVer('12.1.0')
    const result = await updatePath(version)

    expect(result).toBe('/usr/local/cuda-12.1')
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH', '/usr/local/cuda-12.1')
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH_V12_1', '/usr/local/cuda-12.1')
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH_VX_Y', 'CUDA_PATH_V12_1')

    const expectedBinPath = path.join('/usr/local/cuda-12.1', 'bin')
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath)

    const expectedLibPath = path.join('/usr/local/cuda-12.1', 'lib64')
    expect(core.exportVariable).toHaveBeenCalledWith('LD_LIBRARY_PATH', `${expectedLibPath}${path.delimiter}/some/existing/lib`)
  })

  it('should update paths correctly on Linux with empty LD_LIBRARY_PATH', async () => {
    vi.mocked(getOs).mockResolvedValue(OSType.linux)
    delete process.env.LD_LIBRARY_PATH

    const version = new SemVer('12.1.0')
    await updatePath(version)

    const expectedLibPath = path.join('/usr/local/cuda-12.1', 'lib64')
    expect(core.exportVariable).toHaveBeenCalledWith('LD_LIBRARY_PATH', `${expectedLibPath}${path.delimiter}`)
  })

  it('should not add to LD_LIBRARY_PATH on Linux if already present', async () => {
    vi.mocked(getOs).mockResolvedValue(OSType.linux)
    const expectedLibPath = path.join('/usr/local/cuda-12.1', 'lib64')
    process.env.LD_LIBRARY_PATH = expectedLibPath

    const version = new SemVer('12.1.0')
    await updatePath(version)

    expect(core.exportVariable).not.toHaveBeenCalledWith('LD_LIBRARY_PATH', expect.anything())
  })

  it('should update paths correctly on Windows', async () => {
    vi.mocked(getOs).mockResolvedValue(OSType.windows)

    const version = new SemVer('11.8.0')
    const result = await updatePath(version)

    const expectedCudaPath = `C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.8`
    expect(result).toBe(expectedCudaPath)
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH', expectedCudaPath)
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH_V11_8', expectedCudaPath)
    expect(core.exportVariable).toHaveBeenCalledWith('CUDA_PATH_VX_Y', 'CUDA_PATH_V11_8')

    const expectedBinPath = path.join(expectedCudaPath, 'bin')
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath)

    // Should not export LD_LIBRARY_PATH on Windows
    expect(core.exportVariable).not.toHaveBeenCalledWith('LD_LIBRARY_PATH', expect.anything())
  })
})
