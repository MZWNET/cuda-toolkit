import { vi } from 'vitest'
import { getLinks } from '../../src/links/get-links.js'
import { LinuxLinks } from '../../src/links/linux-links.js'
import { WindowsLinks } from '../../src/links/windows-links.js'

vi.mock('node:os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:os')>()
  const isDarwin = mod.platform() === 'darwin'
  return {
    ...mod,
    default: {
      ...(mod as any).default,
      platform: () => (isDarwin ? 'linux' : mod.platform()),
    },
    platform: () => (isDarwin ? 'linux' : mod.platform()),
  }
})
it.concurrent('getLinks gives a valid ILinks class', async () => {
  try {
    const links = await getLinks()
    expect(
      links instanceof LinuxLinks || links instanceof WindowsLinks,
    ).toBeTruthy()
  }
  catch (error) {
    throw new Error(`Error getting links: ${error}`)
    // Other OS
  }
})

it.concurrent('getLinks return same versions in same order', async () => {
  const linuxLinks = LinuxLinks.Instance.getAvailableLocalCudaVersions()
  const windowsLinks = WindowsLinks.Instance.getAvailableLocalCudaVersions()
  const windowsNetworkLinks
    = WindowsLinks.Instance.getAvailableNetworkCudaVersions()

  expect(linuxLinks.length).toBe(windowsLinks.length)
  expect(windowsLinks.length).toBe(windowsNetworkLinks.length)
  expect(linuxLinks).toEqual(windowsLinks)
  expect(windowsLinks).toEqual(windowsNetworkLinks)
})
