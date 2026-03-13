import { Buffer } from 'node:buffer'
import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execReturnOutput } from '../src/run-command.js'

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
}))

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
}))

describe('run-command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execReturnOutput', () => {
    it('should return trimmed stdout of a successful command', async () => {
      const command = 'lsb_release'
      const args = ['-sr']
      const mockOutput = '22.04\n'

      vi.mocked(exec).mockImplementationOnce(async (cmd, args, options) => {
        if (options && options.listeners && options.listeners.stdout) {
          options.listeners.stdout(Buffer.from(mockOutput))
        }
        return 0
      })

      const result = await execReturnOutput(command, args)

      expect(result).toBe('22.04')
      expect(exec).toHaveBeenCalledWith(command, args, expect.any(Object))
      expect(core.debug).not.toHaveBeenCalledWith(expect.stringContaining('Error executing:'))
    })

    it('should handle stderr and log it via core.debug', async () => {
      const command = 'echo'
      const mockStderr = 'some error message'

      vi.mocked(exec).mockImplementationOnce(async (cmd, args, options) => {
        if (options && options.listeners && options.listeners.stderr) {
          options.listeners.stderr(Buffer.from(mockStderr))
        }
        return 0
      })

      const result = await execReturnOutput(command)

      expect(result).toBe('')
      expect(core.debug).toHaveBeenCalledWith(`Error: ${mockStderr}`)
    })

    it('should log an error if the exit code is non-zero', async () => {
      const command = 'false'
      const exitCode = 1

      vi.mocked(exec).mockImplementationOnce(async () => exitCode)

      const result = await execReturnOutput(command)

      expect(result).toBe('')
      expect(core.debug).toHaveBeenCalledWith(`Error executing: ${command}. Exit code: ${exitCode}`)
    })
  })
})
