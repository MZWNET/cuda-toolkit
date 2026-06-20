import { vi } from 'vitest'
import { fetchText } from '@/scripts/update-links/utils/http.js'

it('returns the body text on an ok response', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('hello', { status: 200 }))
  await expect(fetchText('https://x', 'label')).resolves.toBe('hello')
})

it('throws with label and status on a non-ok response', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' }))
  await expect(fetchText('https://x', 'Failed to fetch')).rejects.toThrow('Failed to fetch: 404 Not Found')
})
