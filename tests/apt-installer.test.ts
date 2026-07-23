import { SemVer } from 'semver'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CPUArch } from '@/fixtures/arch.js'
import { exec } from '@/fixtures/exec.js'
import { OSType } from '@/fixtures/platform.js'
import { aptInstall, aptSetup, useApt } from '@/src/apt-installer.js'
import { getArch } from '@/src/arch.js'
import { LinuxLinks } from '@/src/links/linux-links.js'
import { getOs } from '@/src/platform.js'
import { execReturnOutput } from '@/src/run-command.js'

vi.mock('@actions/core', async () => import('@/fixtures/core.js'))
vi.mock('@actions/exec', async () => import('@/fixtures/exec.js'))
vi.mock('@/src/platform.js', async () => import('@/fixtures/platform.js'))
vi.mock('@/src/arch.js', async () => import('@/fixtures/arch.js'))
vi.mock('@/src/run-command.js', () => ({
  execReturnOutput: vi.fn(),
}))

describe('apt-installer', () => {
  beforeEach(() => {
    vi.spyOn(LinuxLinks.Instance, 'getNetworkKeyringURL').mockResolvedValue(null)
  })

  describe('useApt', () => {
    it('should return true for network method on linux', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      const result = await useApt('network')
      expect(result).toBe(true)
    })

    it('should return false for network method on windows', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.windows)
      const result = await useApt('network')
      expect(result).toBe(false)
    })

    it('should return false for local method on linux', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      const result = await useApt('local')
      expect(result).toBe(false)
    })
  })

  describe('aptSetup', () => {
    it('should throw an error if called on non-linux OS', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.windows)
      const version = new SemVer('12.1.0')
      await expect(aptSetup(version)).rejects.toThrow('apt setup can only be run on linux runners!')
    })

    it('successfully set up apt repository on Ubuntu x86_64', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(execReturnOutput).mockResolvedValue('22.04')
      vi.mocked(getArch).mockResolvedValue(CPUArch.x86_64)

      const version = new SemVer('12.1.0')
      await expect(aptSetup(version)).resolves.toBe('stable')

      expect(execReturnOutput).toHaveBeenCalledWith('lsb_release', ['-sr'])
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb -O cuda_keyring.deb',
        ),
      )
      expect(exec).toHaveBeenCalledWith('sudo dpkg -i cuda_keyring.deb')
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-ubuntu2204.pin',
        ),
      )
      expect(exec).toHaveBeenCalledWith('sudo mv cuda-ubuntu2204.pin /etc/apt/preferences.d/cuda-repository-pin-600')
      expect(exec).toHaveBeenCalledWith(
        'sudo add-apt-repository "deb http://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/ /"',
      )
      expect(exec).toHaveBeenCalledWith('sudo apt-get update')
    })

    it('successfully set up apt repository on Ubuntu arm64 (sbsa)', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(execReturnOutput).mockResolvedValue('20.04')
      vi.mocked(getArch).mockResolvedValue(CPUArch.arm64)

      const version = new SemVer('12.1.0')
      await expect(aptSetup(version)).resolves.toBe('stable')

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining(
          'wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/sbsa/cuda-keyring_1.1-1_all.deb -O cuda_keyring.deb',
        ),
      )
    })

    it('sets up the Developer Preview repository for the current Ubuntu version', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      vi.mocked(execReturnOutput).mockResolvedValue('24.04')
      vi.mocked(getArch).mockResolvedValue(CPUArch.arm64)
      const getNetworkKeyringURLSpy = vi
        .spyOn(LinuxLinks.Instance, 'getNetworkKeyringURL')
        .mockResolvedValue(new URL('https://packages.nvidia.com/noble/nvidia-preview-keyring.deb'))

      const version = new SemVer('13.4.0')
      await expect(aptSetup(version)).resolves.toBe('preview')

      expect(getNetworkKeyringURLSpy).toHaveBeenCalledWith(version, '24.04')
      expect(exec).toHaveBeenCalledWith(
        'wget https://packages.nvidia.com/noble/nvidia-preview-keyring.deb -O nvidia-preview-keyring.deb',
      )
      expect(exec).toHaveBeenCalledWith('sudo dpkg -i nvidia-preview-keyring.deb')
      expect(exec).toHaveBeenCalledWith('sudo apt-get update')
      expect(exec).not.toHaveBeenCalledWith(expect.stringContaining('add-apt-repository'))
    })
  })

  describe('aptInstall', () => {
    it('should throw an error if called on non-linux OS', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.windows)
      const version = new SemVer('12.1.0')
      await expect(aptInstall(version, [], [], 'stable')).rejects.toThrow(
        'apt install can only be run on linux runners!',
      )
    })

    it('should install everything if subPackages is empty', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      const version = new SemVer('12.1.0')
      await aptInstall(version, [], [], 'stable')

      expect(exec).toHaveBeenCalledWith('sudo apt-get -y install', ['cuda-12-1'])
    })

    it('installs the toolkit metapackage for a Developer Preview', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      const version = new SemVer('13.4.0')
      await aptInstall(version, [], [], 'preview')

      expect(exec).toHaveBeenCalledWith('sudo apt-get -y install', ['cuda-toolkit-13-4'])
    })

    it('install specific sub-packages and non-cuda prefix packages', async () => {
      vi.mocked(getOs).mockResolvedValue(OSType.linux)
      const version = new SemVer('12.1.0')
      const subPackages = ['nvcc', 'toolkit']
      const nonCuda = ['libcublas', 'libcufft']

      await aptInstall(version, subPackages, nonCuda, 'preview')

      const expectedPackages = ['cuda-nvcc-12-1', 'cuda-toolkit-12-1', 'libcublas-12-1', 'libcufft-12-1']
      expect(exec).toHaveBeenCalledWith('sudo apt-get -y install', expectedPackages)
    })
  })
})
