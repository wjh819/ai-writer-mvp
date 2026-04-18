import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import eslintConfig from '../../../../eslint.config.js'
import * as runPackageEntry from '../index'
import * as runDisplay from './index'

const RUN_DIR = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_SRC_DIR = path.resolve(RUN_DIR, '..')
const PACKAGE_ROOT_DIR = path.resolve(PACKAGE_SRC_DIR, '..')
const FRONTEND_ROOT_DIR = path.resolve(PACKAGE_ROOT_DIR, '..', '..')
const HOST_SRC_DIR = path.resolve(FRONTEND_ROOT_DIR, 'src')
const HOST_COMPONENTS_DIR = path.resolve(HOST_SRC_DIR, 'components')
const LEGACY_HOST_RUN_BRIDGE_FILE = path.resolve(HOST_COMPONENTS_DIR, 'run', 'index.ts')
const LEGACY_HOST_RUN_CONTRACTS_BRIDGE_FILE = path.resolve(
  HOST_SRC_DIR,
  'run',
  'runDisplayContracts.ts'
)
const LEGACY_HOST_RUN_INPUT_TYPES_BRIDGE_FILE = path.resolve(
  HOST_SRC_DIR,
  'run',
  'runDisplayInputTypes.ts'
)
const WORKFLOW_PAGE_DIR = path.resolve(HOST_COMPONENTS_DIR, 'workflow-page')
const SHARED_COMPONENTS_DIR = path.resolve(HOST_COMPONENTS_DIR, 'shared')
const SHARED_WORKFLOW_TYPES_FILE = path.resolve(
  HOST_SRC_DIR,
  'shared',
  'workflowSharedTypes.ts'
)
const SHARED_WORKFLOW_TYPES_MODULE = path.resolve(
  HOST_SRC_DIR,
  'shared',
  'workflowSharedTypes'
)
const RUN_DISPLAY_CONTRACTS_FILE = path.resolve(
  PACKAGE_SRC_DIR,
  'run',
  'runDisplayContracts.ts'
)
const PUBLIC_PACKAGE_SPECIFIER = '@aiwriter/run-display'
const RUN_DISPLAY_PACKAGE_JSON = path.resolve(PACKAGE_ROOT_DIR, 'package.json')
const RUN_DISPLAY_PACKAGE_ENTRY = path.resolve(PACKAGE_SRC_DIR, 'index.ts')
const RUN_DISPLAY_PACKAGE_VITE_CONFIG = path.resolve(PACKAGE_ROOT_DIR, 'vite.config.ts')
const RUN_DISPLAY_PACKAGE_TSCONFIG = path.resolve(
  PACKAGE_ROOT_DIR,
  'tsconfig.types.json'
)
const WORKFLOW_RUNTIME_CONTROLLERS_DIR = path.resolve(
  HOST_SRC_DIR,
  'workflow-editor',
  'controllers'
)

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

function isPackageRunEntryTarget(target: string): boolean {
  return (
    target === RUN_DIR ||
    target === path.join(RUN_DIR, 'index') ||
    target === path.join(RUN_DIR, 'index.ts') ||
    target === path.join(RUN_DIR, 'index.tsx')
  )
}

function isLegacyRunBridgeImport(specifier: string): boolean {
  return (
    specifier === './run' ||
    specifier === './run/index' ||
    specifier === '../run' ||
    specifier === '../run/index' ||
    specifier === 'components/run' ||
    specifier === 'components/run/index' ||
    specifier.endsWith('/components/run') ||
    specifier.endsWith('/components/run/index')
  )
}

function isSharedWorkflowTypesTarget(target: string): boolean {
  return (
    target === SHARED_WORKFLOW_TYPES_MODULE ||
    target === SHARED_WORKFLOW_TYPES_FILE ||
    target === path.join(SHARED_WORKFLOW_TYPES_MODULE, 'index') ||
    target === path.join(SHARED_WORKFLOW_TYPES_MODULE, 'index.ts')
  )
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

describe('run-display package boundary contract', () => {
  it('keeps package runtime entry exports stable and minimal', () => {
    expect(Object.keys(runDisplay).sort()).toEqual(
      [
        'RunResultPanel',
        'buildDisplayRunFromDirectRun',
        'buildDisplayRunFromLiveSnapshot',
      ].sort()
    )
  })

  it('keeps package public entry exports stable and minimal', () => {
    expect(Object.keys(runPackageEntry).sort()).toEqual(
      [
        'RunResultPanel',
        'buildDisplayRunFromDirectRun',
        'buildDisplayRunFromLiveSnapshot',
      ].sort()
    )

    const packageEntrySource = readFileSync(RUN_DISPLAY_PACKAGE_ENTRY, 'utf8')
    expect(packageEntrySource).toContain('export type { DisplayRun }')
  })

  it('removes legacy host run bridges after cutover', () => {
    expect(existsSync(LEGACY_HOST_RUN_BRIDGE_FILE)).toBe(false)
    expect(existsSync(LEGACY_HOST_RUN_CONTRACTS_BRIDGE_FILE)).toBe(false)
    expect(existsSync(LEGACY_HOST_RUN_INPUT_TYPES_BRIDGE_FILE)).toBe(false)
  })

  it('does not allow host src modules to deep-import package run internals', () => {
    const violations: string[] = []
    const sourceFiles = listSourceFiles(HOST_SRC_DIR)
    let publicSpecifierUseCount = 0

    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8')
      const importSpecs = extractImportSpecifiers(source)

      for (const specifier of importSpecs) {
        if (specifier === PUBLIC_PACKAGE_SPECIFIER) {
          publicSpecifierUseCount += 1
          continue
        }

        if (specifier.startsWith(`${PUBLIC_PACKAGE_SPECIFIER}/`)) {
          const relativeFile = toPosix(path.relative(HOST_SRC_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
          continue
        }

        if (isLegacyRunBridgeImport(specifier)) {
          const relativeFile = toPosix(path.relative(HOST_SRC_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
          continue
        }

        const resolved = resolveRelativeImport(file, specifier)
        if (!resolved) {
          continue
        }

        if (resolved.startsWith(RUN_DIR) && !isPackageRunEntryTarget(resolved)) {
          const relativeFile = toPosix(path.relative(HOST_SRC_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
          continue
        }

        if (resolved.startsWith(PACKAGE_SRC_DIR)) {
          const relativeFile = toPosix(path.relative(HOST_SRC_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
    expect(publicSpecifierUseCount).toBeGreaterThan(0)
  })

  it('does not allow package run boundary code to import host workflow-page/shared/runtime modules', () => {
    const violations: string[] = []
    const runFiles = listSourceFiles(RUN_DIR)

    for (const file of runFiles) {
      const source = readFileSync(file, 'utf8')
      const importSpecs = extractImportSpecifiers(source)

      for (const specifier of importSpecs) {
        const resolved = resolveRelativeImport(file, specifier)
        if (!resolved) {
          continue
        }

        if (
          resolved.startsWith(WORKFLOW_PAGE_DIR) ||
          resolved.startsWith(SHARED_COMPONENTS_DIR) ||
          isSharedWorkflowTypesTarget(resolved) ||
          resolved.startsWith(WORKFLOW_RUNTIME_CONTROLLERS_DIR)
        ) {
          const relativeFile = toPosix(path.relative(RUN_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps WorkflowState owner in package runDisplayContracts and not host shared/workflowSharedTypes', () => {
    const violations: string[] = []
    const source = readFileSync(RUN_DISPLAY_CONTRACTS_FILE, 'utf8')
    const importSpecs = extractImportSpecifiers(source)

    for (const specifier of importSpecs) {
      const resolved = resolveRelativeImport(RUN_DISPLAY_CONTRACTS_FILE, specifier)
      if (!resolved) {
        continue
      }

      if (isSharedWorkflowTypesTarget(resolved)) {
        violations.push(specifier)
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps eslint import restriction rules for package run boundary', () => {
    const patterns = readNoRestrictedImportPatterns()

    expect(patterns).toEqual(
      expect.arrayContaining([
        '@aiwriter/run-display',
        '@aiwriter/run-display/*',
        'components/run',
        '**/components/run',
        'packages/run-display/src/run-display',
        '**/packages/run-display/src/run-display',
        'packages/run-display/src/run-display/*',
        '**/packages/run-display/src/run-display/*',
        'packages/run-display/src',
        'packages/run-display/src/*',
        '**/packages/run-display/src',
        '**/packages/run-display/src/*',
        '../../../../src/components/workflow-page',
        '../../../../src/components/workflow-page/*',
        '../../../../../src/components/workflow-page',
        '../../../../../src/components/workflow-page/*',
        '../../../../src/components/shared',
        '../../../../src/components/shared/*',
        '../../../../../src/components/shared',
        '../../../../../src/components/shared/*',
        '../../../../src/shared/workflowSharedTypes',
        '../../../../../src/shared/workflowSharedTypes',
        '../../../../src/workflow-editor/controllers',
        '../../../../src/workflow-editor/controllers/*',
        '../../../../../src/workflow-editor/controllers',
        '../../../../../src/workflow-editor/controllers/*',
      ])
    )
  })

  it('keeps run-display package artifact pipeline in place', () => {
    const rootPackageJson = JSON.parse(
      readFileSync(path.resolve(FRONTEND_ROOT_DIR, 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>
    }

    expect(rootPackageJson.scripts?.['build:run-display-package']).toBe(
      'npm --prefix packages/run-display run build'
    )

    const packageJson = JSON.parse(readFileSync(RUN_DISPLAY_PACKAGE_JSON, 'utf8')) as {
      scripts?: Record<string, string>
      exports?: Record<string, { types?: string; import?: string }>
      types?: string
      files?: string[]
    }

    expect(packageJson.scripts?.build).toBe(
      'npm run clean && npm run build:js && npm run build:types'
    )
    expect(packageJson.scripts?.['build:js']).toBe(
      'node ../../node_modules/vite/bin/vite.js build --config ./vite.config.ts'
    )
    expect(packageJson.scripts?.['build:types']).toBe(
      'node ../../node_modules/typescript/bin/tsc -p ./tsconfig.types.json'
    )
    expect(packageJson.types).toBe('./dist/types/packages/run-display/src/index.d.ts')
    expect(packageJson.exports?.['.']?.import).toBe('./dist/index.js')
    expect(packageJson.exports?.['.']?.types).toBe(
      './dist/types/packages/run-display/src/index.d.ts'
    )
    expect(packageJson.files).toEqual(expect.arrayContaining(['dist']))

    expect(statSync(RUN_DISPLAY_PACKAGE_ENTRY).isFile()).toBe(true)
    expect(statSync(RUN_DISPLAY_PACKAGE_VITE_CONFIG).isFile()).toBe(true)
    expect(statSync(RUN_DISPLAY_PACKAGE_TSCONFIG).isFile()).toBe(true)
  })
})
