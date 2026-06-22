import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const LINUX_LINKS_PATH = resolve(__dirname, 'linux-links.json')
export const WINDOWS_LINKS_PATH = resolve(__dirname, 'windows-links.json')
