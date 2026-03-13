import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterReadable, getFilesRecursive } from '../src/fs-utils.js'

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readdir: vi.fn(),
      access: vi.fn(),
    },
    constants: {
      R_OK: 4,
    },
  },
}))

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
}))

describe('fs-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFilesRecursive', () => {
    it('should return all files under directory recursively', async () => {
      const mockDir = '/mock/root'

      // Mock readdir for root
      vi.mocked(fs.promises.readdir).mockResolvedValueOnce([
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'subdir', isDirectory: () => true, isFile: () => false },
      ] as unknown as Awaited<ReturnType<typeof fs.promises.readdir>>)

      // Mock readdir for subdir
      vi.mocked(fs.promises.readdir).mockResolvedValueOnce([
        { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
      ] as unknown as Awaited<ReturnType<typeof fs.promises.readdir>>)

      const files = await getFilesRecursive(mockDir)

      expect(files).toEqual([
        path.join(mockDir, 'file1.txt'),
        path.join(mockDir, 'subdir', 'file2.txt'),
      ])
      expect(fs.promises.readdir).toHaveBeenCalledTimes(2)
    })

    it('should return empty array if readdir fails', async () => {
      vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('Read error'))
      const files = await getFilesRecursive('/invalid/path')
      expect(files).toEqual([])
    })
  })

  describe('filterReadable', () => {
    it('should filter out non-readable or missing files', async () => {
      const files = ['/path/readable.txt', '/path/missing.txt', '/path/noaccess.txt']

      vi.mocked(fs.promises.access).mockImplementation(async (p) => {
        if (p === '/path/readable.txt')
          return Promise.resolve()
        throw new Error('Access denied or not found')
      })

      const result = await filterReadable(files)

      expect(result).toEqual(['/path/readable.txt'])
      expect(fs.promises.access).toHaveBeenCalledTimes(3)
    })
  })
})
