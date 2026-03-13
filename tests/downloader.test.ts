import fs from 'node:fs'
import * as cache from '@actions/cache'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import { SemVer } from 'semver'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CPUArch, getArch } from '../src/arch.js'
import { download } from '../src/downloader.js'
import { getFilesRecursive } from '../src/fs-utils.js'
import { getLinks } from '../src/links/get-links.js'
import { getOs, getRelease, OSType } from '../src/platform.js'

vi.mock('@actions/cache', () => ({
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}))

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('@actions/io', () => ({
  mkdirP: vi.fn(),
  mv: vi.fn(),
}))

vi.mock('@actions/tool-cache', () => ({
  find: vi.fn(),
  downloadTool: vi.fn(),
  cacheFile: vi.fn(),
}))

vi.mock('../src/platform.js', () => ({
  getOs: vi.fn(),
  OSType: {
    windows: 'windows',
    linux: 'linux',
  },
  getRelease: vi.fn(),
}))

vi.mock('../src/arch.js', () => ({
  getArch: vi.fn(),
  CPUArch: {
    x86_64: 'x64',
    arm64: 'arm64',
  },
}))

vi.mock('../src/fs-utils.js', () => ({
  getFilesRecursive: vi.fn(),
}))

vi.mock('../src/links/get-links.js', () => ({
  getLinks: vi.fn(),
}))

// Mock node:fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    default: {
      ...actual,
      promises: {
        ...actual.promises,
        chmod: vi.fn(),
        stat: vi.fn(),
        realpath: vi.fn(),
      },
    },
  }
})

describe('downloader', () => {
  const version = new SemVer('12.1.0')
  const method = 'local'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOs).mockResolvedValue(OSType.linux)
    vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)
    vi.mocked(getRelease).mockResolvedValue('22.04')
    vi.mocked(getFilesRecursive).mockResolvedValue(['/mock/path/installer.run'])

    const mockLinks = {
      getLocalURLFromCudaVersion: vi.fn().mockResolvedValue(new URL('https://developer.nvidia.com/mock.run')),
      getNetworkURLFromCudaVersion: vi.fn().mockReturnValue(new URL('https://developer.nvidia.com/mock_network.exe')),
    }
    vi.mocked(getLinks).mockResolvedValue(mockLinks as unknown as Awaited<ReturnType<typeof getLinks>>)
  })

  describe('download', () => {
    it('should return from local cache if found and useLocalCache is true', async () => {
      vi.mocked(tc.find).mockReturnValue('/local/cache/path')
      vi.mocked(getFilesRecursive).mockResolvedValue(['/local/cache/path/installer.run'])

      const result = await download(version, method, true, false)

      expect(result).toBe('/local/cache/path/installer.run')
      expect(tc.find).toHaveBeenCalledWith('cuda_installer-linux-22.04-x64', '12.1.0')
      expect(cache.restoreCache).not.toHaveBeenCalled()
      expect(tc.downloadTool).not.toHaveBeenCalled()
    })

    it('should return from GitHub cache if found, useGitHubCache is true, and local cache misses', async () => {
      vi.mocked(tc.find).mockReturnValue('') // local cache miss
      vi.mocked(cache.restoreCache).mockResolvedValue('matched-key') // github cache hit
      vi.mocked(getFilesRecursive).mockResolvedValue(['cuda_installer-linux-22.04-x64-12.1.0/installer.run'])

      await download(version, method, true, true)

      expect(cache.restoreCache).toHaveBeenCalledWith(['cuda_installer-linux-22.04-x64-12.1.0'], 'cuda_installer-linux-22.04-x64-12.1.0')
      expect(tc.downloadTool).not.toHaveBeenCalled()
    })

    it('should download tool and cache to both locations if misses', async () => {
      vi.mocked(tc.find).mockReturnValue('')
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined)

      // Assume file doesn't exist
      vi.mocked(fs.promises.stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.promises.realpath).mockResolvedValue('/absolute/path')
      vi.mocked(tc.cacheFile).mockResolvedValue('/new/local/cache')
      vi.mocked(getFilesRecursive)
        .mockResolvedValueOnce(['/path/to/installer.run']) // For Github Cache Dir reading
        .mockResolvedValueOnce(['/path/to/installer.run']) // For Executable Dir reading

      await download(version, method, true, true)

      // Download occurred
      expect(tc.downloadTool).toHaveBeenCalledWith('https://developer.nvidia.com/mock.run', 'cuda_download/cuda_installer-linux-22.04-x64_12.1.0.run')

      // Local caching occurred
      expect(tc.cacheFile).toHaveBeenCalledWith('cuda_download/cuda_installer-linux-22.04-x64_12.1.0.run', 'cuda_installer-linux-22.04-x64_12.1.0.run', 'cuda_installer-linux-x64', '12.1.0')

      // GitHub caching occurred
      expect(io.mkdirP).toHaveBeenCalledWith('cuda_installer-linux-22.04-x64-12.1.0')
      expect(io.mv).toHaveBeenCalledWith('cuda_download/cuda_installer-linux-22.04-x64_12.1.0.run', 'cuda_installer-linux-22.04-x64-12.1.0')
      expect(cache.saveCache).toHaveBeenCalledWith(['cuda_installer-linux-22.04-x64-12.1.0'], 'cuda_installer-linux-22.04-x64-12.1.0')

      // Chmod for linux
      expect(fs.promises.chmod).toHaveBeenCalledWith(expect.any(String), '0755')
    })

    it('should throw error if zero files in cache', async () => {
      vi.mocked(tc.find).mockReturnValue('/local/cache/path')
      vi.mocked(getFilesRecursive).mockResolvedValue([]) // Return zero files

      await expect(download(version, method, true, false)).rejects.toThrow('Got no files in tool cache')
    })

    it('should throw error if multiple files in cache', async () => {
      vi.mocked(tc.find).mockReturnValue('/local/cache/path')
      vi.mocked(getFilesRecursive).mockResolvedValue(['file1', 'file2']) // Return >1 file

      await expect(download(version, method, true, false)).rejects.toThrow('Got multiple file in tool cache: 2')
    })
  })
})
