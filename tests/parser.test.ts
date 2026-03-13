import * as core from '@actions/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parsePackages } from '../src/parser.js'

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
}))

describe('parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parsePackages', () => {
    it('should successfully parse a valid JSON array of strings', async () => {
      const input = '["nvcc", "visual_studio_integration"]'
      const paramName = 'sub-packages'

      const result = await parsePackages(input, paramName)

      expect(result).toEqual(['nvcc', 'visual_studio_integration'])
      expect(core.debug).not.toHaveBeenCalledWith(expect.stringContaining('Json parsing error'))
    })

    it('should throw an error when provided with an invalid JSON string', async () => {
      const input = 'invalid json'
      const paramName = 'sub-packages'

      await expect(parsePackages(input, paramName)).rejects.toThrow(
        `Error parsing input '${paramName}' to a JSON string array: ${input}`,
      )

      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Json parsing error:'))
    })

    it('should handle empty JSON arrays successfully', async () => {
      const input = '[]'
      const paramName = 'sub-packages'

      const result = await parsePackages(input, paramName)

      expect(result).toEqual([])
    })
  })
})
