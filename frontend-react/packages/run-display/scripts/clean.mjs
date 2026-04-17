import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = resolve(fileURLToPath(new URL('.', import.meta.url)))
const distDir = resolve(currentDir, '..', 'dist')

try {
  rmSync(distDir, { recursive: true, force: true })
} catch (error) {
  const code = typeof error === 'object' && error ? error.code : undefined
  if (code !== 'ENOENT' && code !== 'EPERM') {
    throw error
  }
}
