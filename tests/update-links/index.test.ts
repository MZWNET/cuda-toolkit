import type { DownloadLinks } from '@/scripts/update-links/releases.js'
import { describe, expect, it } from 'vitest'
import { buildLinkModels } from '@/scripts/update-links/index.js'

function release(
  version: string,
  channel: DownloadLinks['channel'],
  overrides: Partial<DownloadLinks> = {},
): DownloadLinks {
  return {
    version,
    channel,
    linuxLocal: { x86_64: null, arm64: null },
    linuxNetwork: { x86_64: {}, arm64: {} },
    windowsLocal: { x86_64: null, arm64: null },
    windowsNetwork: { x86_64: null, arm64: null },
    ...overrides,
  }
}

describe('buildLinkModels', () => {
  it('sorts every mapping by descending SemVer', () => {
    const { windowsLinks } = buildLinkModels([
      release('9.2.148', 'stable', {
        windowsLocal: { x86_64: 'https://example.test/9.2.exe', arm64: null },
      }),
      release('13.4.0', 'preview', {
        windowsLocal: { x86_64: 'https://example.test/13.4.exe', arm64: null },
      }),
      release('10.0.130', 'stable', {
        windowsLocal: { x86_64: 'https://example.test/10.0.exe', arm64: null },
      }),
    ])

    expect(Object.keys(windowsLinks.local.x86_64)).toEqual(['13.4.0', '10.0.130', '9.2.148'])
  })

  it('uses the complete stable record when a version also has a preview record', () => {
    const preview = release('13.4.0', 'preview', {
      linuxNetwork: {
        x86_64: { '24.04': 'https://example.test/preview-keyring.deb' },
        arm64: {},
      },
      windowsLocal: {
        x86_64: 'https://example.test/preview-x86.exe',
        arm64: 'https://example.test/preview-arm.exe',
      },
    })
    const stable = release('13.4.0', 'stable', {
      linuxLocal: {
        x86_64: 'https://example.test/stable.run',
        arm64: null,
      },
      windowsLocal: {
        x86_64: 'https://example.test/stable.exe',
        arm64: null,
      },
      windowsNetwork: {
        x86_64: 'https://example.test/stable-network.exe',
        arm64: null,
      },
    })

    const { linuxLinks, windowsLinks } = buildLinkModels([preview, stable])

    expect(linuxLinks.local.x86_64['13.4.0']).toBe('https://example.test/stable.run')
    expect(linuxLinks.network.x86_64['13.4.0']).toBeUndefined()
    expect(windowsLinks.local.x86_64['13.4.0']).toBe('https://example.test/stable.exe')
    expect(windowsLinks.local.arm64['13.4.0']).toBeUndefined()
    expect(windowsLinks.network.x86_64['13.4.0']).toBe('https://example.test/stable-network.exe')
  })
})
