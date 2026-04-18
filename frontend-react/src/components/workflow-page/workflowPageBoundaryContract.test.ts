import { readdirSync, readFileSync, statSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import eslintConfig from '../../../eslint.config.js'

const WORKFLOW_PAGE_DIR = path.dirname(fileURLToPath(import.meta.url))
const ORCHESTRATION_DIR = path.resolve(WORKFLOW_PAGE_DIR, 'orchestration')
const SHELL_DIR = path.resolve(WORKFLOW_PAGE_DIR, 'shell')
const DOMAIN_LAYER_DIRS = [
  path.resolve(WORKFLOW_PAGE_DIR, 'canvas'),
  path.resolve(WORKFLOW_PAGE_DIR, 'run'),
  path.resolve(WORKFLOW_PAGE_DIR, 'graph'),
  path.resolve(WORKFLOW_PAGE_DIR, 'subgraph'),
]
const IMPLEMENTATION_LAYER_DIRS = [...DOMAIN_LAYER_DIRS, SHELL_DIR]

function toPosix(filePath: string) {
  return filePath.split(path.sep).join('/')
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = []
  const stack = [dir]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    for (const name of readdirSync(current)) {
      const fullPath = path.join(current, name)
      const stats = statSync(fullPath)

      if (stats.isDirectory()) {
        stack.push(fullPath)
        continue
      }

      const isSource = fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')
      const isTest = fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx')
      if (isSource && !isTest) {
        files.push(fullPath)
      }
    }
  }

  return files
}

function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = []
  const fromRegex = /from\s+['"]([^'"]+)['"]/g

  let match: RegExpExecArray | null = fromRegex.exec(source)
  while (match) {
    specs.push(match[1])
    match = fromRegex.exec(source)
  }

  return specs
}

function resolveRelativeImport(importerFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null
  }

  return path.normalize(path.resolve(path.dirname(importerFile), specifier))
}

function readNoRestrictedImportPatterns() {
  const configEntries = Array.isArray(eslintConfig)
    ? eslintConfig
    : [eslintConfig]

  return configEntries
    .map(entry => entry?.rules?.['no-restricted-imports'])
    .filter(Boolean)
    .flatMap(rule => {
      if (!Array.isArray(rule) || typeof rule[1] !== 'object' || !rule[1]) {
        return []
      }

      const options = rule[1] as { patterns?: Array<{ group?: string[] }> }
      return (options.patterns || []).flatMap(pattern => pattern.group || [])
    })
}

describe('workflow-page boundary contract', () => {
  it('keeps physical layer directories in workflow-page', () => {
    for (const dir of [
      ORCHESTRATION_DIR,
      ...IMPLEMENTATION_LAYER_DIRS,
    ]) {
      expect(statSync(dir).isDirectory()).toBe(true)
    }
  })

  it('does not keep root workflow-page source bridge files after cutover', () => {
    const rootSourceFiles = readdirSync(WORKFLOW_PAGE_DIR)
      .map(name => path.join(WORKFLOW_PAGE_DIR, name))
      .filter(fullPath => statSync(fullPath).isFile())
      .filter(fullPath => fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))
      .filter(fullPath => !fullPath.endsWith('.test.ts'))
      .filter(fullPath => !fullPath.endsWith('.test.tsx'))

    expect(rootSourceFiles).toEqual([])
  })

  it('does not allow lower workflow-page layers to import orchestration layer', () => {
    const violations: string[] = []
    const implementationFiles = DOMAIN_LAYER_DIRS.flatMap(listSourceFiles)

    for (const file of implementationFiles) {
      const source = readFileSync(file, 'utf8')
      const importSpecs = extractImportSpecifiers(source)

      for (const specifier of importSpecs) {
        const resolved = resolveRelativeImport(file, specifier)
        if (!resolved) {
          continue
        }

        const isOrchestrationTarget = resolved.startsWith(ORCHESTRATION_DIR)

        if (isOrchestrationTarget) {
          const relativeFile = toPosix(path.relative(WORKFLOW_PAGE_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('does not allow canvas/run/graph/subgraph layers to import shell rendering layer', () => {
    const violations: string[] = []
    const domainFiles = DOMAIN_LAYER_DIRS.flatMap(listSourceFiles)

    for (const file of domainFiles) {
      const source = readFileSync(file, 'utf8')
      const importSpecs = extractImportSpecifiers(source)

      for (const specifier of importSpecs) {
        const resolved = resolveRelativeImport(file, specifier)
        if (!resolved) {
          continue
        }

        const isShellTarget = resolved.startsWith(SHELL_DIR)

        if (isShellTarget) {
          const relativeFile = toPosix(path.relative(WORKFLOW_PAGE_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps eslint restrictions for workflow-page layer boundaries', () => {
    const patterns = readNoRestrictedImportPatterns()

    expect(patterns).toEqual(
      expect.arrayContaining([
        '../orchestration',
        '../orchestration/*',
        '../../orchestration',
        '../../orchestration/*',
        '**/components/workflow-page/orchestration',
        '**/components/workflow-page/orchestration/*',
        '../shell',
        '../shell/*',
        '../../shell',
        '../../shell/*',
        '**/components/workflow-page/shell',
        '**/components/workflow-page/shell/*',
        '../../../workflow-editor/controllers',
        '../../../workflow-editor/controllers/*',
        '../../../workflow-editor/operations',
        '../../../workflow-editor/operations/*',
      ])
    )
  })
})
