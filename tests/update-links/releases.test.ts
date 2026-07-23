import type { ReleaseChannel } from '@/scripts/update-links/archive.js'
import { describe, expect, it } from 'vitest'
import { parseDownloadLinks } from '@/scripts/update-links/releases.js'

function details(downloadUrl: string, keyringUrl?: string): string {
  return [
    `<a id="targetDownloadButtonHref" href="${downloadUrl}">Download</a>`,
    keyringUrl === undefined ? '' : `<code>wget ${keyringUrl}</code>`,
  ].join('')
}

function page(title: string, releases: Record<string, { details: string }>): string {
  const props = JSON.stringify({ pageData: { header: { title }, releases } })
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
  return `<div data-react-props="${props}"></div>`
}

function parse(title: string, releases: Record<string, { details: string }>, channel: ReleaseChannel) {
  return parseDownloadLinks(page(title, releases), 'https://example.test/cuda', channel)
}

describe('parseDownloadLinks', () => {
  it('keeps the required stable installers and optional ARM64 local installer', () => {
    const result = parse(
      'CUDA Toolkit 13.3 Downloads',
      {
        'Linux/x86_64/Ubuntu/24.04/runfile_local': {
          details: details(
            'https://developer.download.nvidia.com/compute/cuda/13.3.0/local_installers/cuda_13.3.0_linux.run',
          ),
        },
        'Linux/arm64-sbsa/Ubuntu/24.04/runfile_local': {
          details: details(
            'https://developer.download.nvidia.com/compute/cuda/13.3.0/local_installers/cuda_13.3.0_linux_sbsa.run',
          ),
        },
        'Windows/x86_64/11/exe_local': {
          details: details(
            'https://developer.download.nvidia.com/compute/cuda/13.3.0/local_installers/cuda_13.3.0_windows.exe',
          ),
        },
        'Windows/x86_64/11/exe_network': {
          details: details(
            'https://developer.download.nvidia.com/compute/cuda/13.3.0/network_installers/cuda_13.3.0_windows_network.exe',
          ),
        },
      },
      'stable',
    )

    expect(result).toMatchObject({
      version: '13.3.0',
      channel: 'stable',
      linuxNetwork: { x86_64: {}, arm64: {} },
      windowsLocal: { arm64: null },
      windowsNetwork: { arm64: null },
    })
    expect(result.linuxLocal.x86_64).toContain('cuda_13.3.0_linux.run')
    expect(result.linuxLocal.arm64).toContain('cuda_13.3.0_linux_sbsa.run')
    expect(result.windowsLocal.x86_64).toContain('cuda_13.3.0_windows.exe')
    expect(result.windowsNetwork.x86_64).toContain('cuda_13.3.0_windows_network.exe')
  })

  it('parses the partial Developer Preview matrix independently', () => {
    const previewBase = 'https://packages.nvidia.com/prerelease/cuda/13.4.0'
    const result = parse(
      'CUDA Toolkit 13.4 Developer Preview Downloads',
      {
        'Linux/x86_64/Ubuntu/22.04/deb_network': {
          details: details(
            `${previewBase}/network_installers/cuda-toolkit-13-4_13.4.0-1_amd64.deb`,
            'https://packages.nvidia.com/jammy/nvidia-preview-keyring.deb',
          ),
        },
        'Linux/arm64-sbsa/Native/Ubuntu/24.04/deb_network': {
          details: details(
            `${previewBase}/network_installers/cuda-toolkit-13-4_13.4.0-1_arm64.deb`,
            'https://packages.nvidia.com/noble/nvidia-preview-keyring.deb',
          ),
        },
        'Windows/x86_64/11/exe_local': {
          details: details(`${previewBase}/local_installers/cuda_13.4.0_windows_x86_64.exe`),
        },
        'Windows/arm64/11/exe_local': {
          details: details(`${previewBase}/local_installers/cuda_13.4.0_windows_arm64.exe`),
        },
      },
      'preview',
    )

    expect(result).toEqual({
      version: '13.4.0',
      channel: 'preview',
      linuxLocal: { x86_64: null, arm64: null },
      linuxNetwork: {
        x86_64: {
          '22.04': 'https://packages.nvidia.com/jammy/nvidia-preview-keyring.deb',
        },
        arm64: {
          '24.04': 'https://packages.nvidia.com/noble/nvidia-preview-keyring.deb',
        },
      },
      windowsLocal: {
        x86_64: `${previewBase}/local_installers/cuda_13.4.0_windows_x86_64.exe`,
        arm64: `${previewBase}/local_installers/cuda_13.4.0_windows_arm64.exe`,
      },
      windowsNetwork: { x86_64: null, arm64: null },
    })
  })

  it('rejects an unknown preview release structure', () => {
    expect(() =>
      parse(
        'CUDA Toolkit 13.4 Developer Preview Downloads',
        {
          'Plan9/mips/unknown': {
            details: details('https://packages.nvidia.com/prerelease/cuda/13.4.0/unknown.bin'),
          },
        },
        'preview',
      ),
    ).toThrow('No supported download entries found')
  })
})
