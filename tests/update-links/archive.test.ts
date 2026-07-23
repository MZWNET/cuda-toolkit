import { describe, expect, it } from 'vitest'
import { parseArchiveVersions } from '@/scripts/update-links/archive.js'

describe('parseArchiveVersions', () => {
  it('marks stable and Developer Preview archive entries', () => {
    const html = [
      '<a href="/cuda-13-4-0-download-archive">CUDA Toolkit 13.4.0 Developer Preview</a>',
      '<a href="/cuda-13-3-0-download-archive">CUDA Toolkit 13.3.0</a>',
      '<a href="/cuda-75-downloads-archive">CUDA Toolkit 7.5</a>',
    ].join('\n')

    const entries = parseArchiveVersions(html)

    expect(entries.map(entry => ({ version: entry.version, channel: entry.channel }))).toEqual([
      { version: '13.4.0 Developer Preview', channel: 'preview' },
      { version: '13.3.0', channel: 'stable' },
      { version: '7.5', channel: 'stable' },
    ])
  })
})
