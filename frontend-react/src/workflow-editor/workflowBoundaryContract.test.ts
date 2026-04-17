import { readdirSync, readFileSync, statSync } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import eslintConfig from '../../eslint.config.js'

const WORKFLOW_EDITOR_DIR = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(WORKFLOW_EDITOR_DIR, '..')
const FRONTEND_ROOT_DIR = path.resolve(SRC_DIR, '..')
const WORKFLOW_PAGE_DIR = path.resolve(SRC_DIR, 'components', 'workflow-page')
const RUN_DISPLAY_DIR = path.resolve(
  FRONTEND_ROOT_DIR,
  'packages',
  'run-display',
  'src',
  'run-display'
)
const WORKFLOW_EDITOR_CONTROLLERS_DIR = path.resolve(
  WORKFLOW_EDITOR_DIR,
  'controllers'
)
const RUN_DISPLAY_PACKAGE_SPECIFIER = '@aiwriter/run-display'
const WORKFLOW_RUNTIME_FILE = path.resolve(
  WORKFLOW_EDITOR_CONTROLLERS_DIR,
  'useWorkflowRuntime.ts'
)
const WORKFLOW_PAGE_ASSEMBLER_FILE = path.resolve(
  WORKFLOW_PAGE_DIR,
  'useWorkflowEditorPageAssembler.ts'
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

function isWorkflowRuntimeControllerTarget(target: string): boolean {
  return (
    target === path.join(WORKFLOW_EDITOR_CONTROLLERS_DIR, 'useWorkflowRuntime') ||
    target === WORKFLOW_RUNTIME_FILE ||
    target === path.join(WORKFLOW_EDITOR_CONTROLLERS_DIR, 'useWorkflowRuntime.tsx')
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

describe('workflow-editor boundary contract', () => {
  it('does not allow workflow-editor modules to import workflow-page host modules', () => {
    const violations: string[] = []
    const workflowEditorFiles = listSourceFiles(WORKFLOW_EDITOR_DIR)

    for (const file of workflowEditorFiles) {
      const source = readFileSync(file, 'utf8')
      const importSpecs = extractImportSpecifiers(source)

      for (const specifier of importSpecs) {
        const resolved = resolveRelativeImport(file, specifier)
        if (!resolved) {
          continue
        }

        if (resolved.startsWith(WORKFLOW_PAGE_DIR)) {
          const relativeFile = toPosix(path.relative(WORKFLOW_EDITOR_DIR, file))
          violations.push(`${relativeFile} -> ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps workflow runtime facade free from workflow-page and run-display imports', () => {
    const violations: string[] = []
    const source = readFileSync(WORKFLOW_RUNTIME_FILE, 'utf8')
    const importSpecs = extractImportSpecifiers(source)

    for (const specifier of importSpecs) {
      if (specifier === RUN_DISPLAY_PACKAGE_SPECIFIER) {
        violations.push(specifier)
        continue
      }

      if (specifier.startsWith(`${RUN_DISPLAY_PACKAGE_SPECIFIER}/`)) {
        violations.push(specifier)
        continue
      }

      const resolved = resolveRelativeImport(WORKFLOW_RUNTIME_FILE, specifier)
      if (!resolved) {
        continue
      }

      if (resolved.startsWith(WORKFLOW_PAGE_DIR) || resolved.startsWith(RUN_DISPLAY_DIR)) {
        violations.push(specifier)
      }
    }

    expect(violations).toEqual([])
  })

  it('requires workflow-page assembler to consume workflow-editor only via runtime facade', () => {
    const violations: string[] = []
    const source = readFileSync(WORKFLOW_PAGE_ASSEMBLER_FILE, 'utf8')
    const importSpecs = extractImportSpecifiers(source)

    for (const specifier of importSpecs) {
      const resolved = resolveRelativeImport(WORKFLOW_PAGE_ASSEMBLER_FILE, specifier)
      if (!resolved) {
        continue
      }

      if (
        resolved.startsWith(WORKFLOW_EDITOR_DIR) &&
        !isWorkflowRuntimeControllerTarget(resolved)
      ) {
        violations.push(specifier)
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps eslint import restriction rules for workflow runtime/page boundary', () => {
    const patterns = readNoRestrictedImportPatterns()

    expect(patterns).toEqual(
      expect.arrayContaining([
        '**/components/workflow-page',
        '**/components/workflow-page/*',
        '@aiwriter/run-display',
        '@aiwriter/run-display/*',
        '**/packages/run-display/src/run-display',
        '**/packages/run-display/src/run-display/*',
        '../../workflow-editor/domain',
        '../../workflow-editor/domain/*',
        '../../workflow-editor/state',
        '../../workflow-editor/state/*',
        '../../workflow-editor/actions',
        '../../workflow-editor/actions/*',
        '../../workflow-editor/operations',
        '../../workflow-editor/operations/*',
        '../../workflow-editor/controllers/useWorkflowGraphEditor',
        '../../workflow-editor/controllers/useWorkflowPersistence',
      ])
    )
  })
})
