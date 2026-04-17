import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', '**/dist']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                './run',
                './run/*',
                '../run',
                '../run/*',
                '../../components/run',
                '../../components/run/*',
                '../components/run',
                '../components/run/*',
                'components/run',
                'components/run/*',
                '**/components/run',
                '**/components/run/*',
                '@aiwriter/run-display/*',
                'packages/run-display/src',
                'packages/run-display/src/*',
                '**/packages/run-display/src',
                '**/packages/run-display/src/*',
              ],
              message:
                'Use the run-display package public entry (@aiwriter/run-display) instead of bridge or deep imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'components/run',
                'components/run/*',
                '**/components/run',
                '**/components/run/*',
                '@aiwriter/run-display/*',
                'packages/run-display/src',
                'packages/run-display/src/*',
                '**/packages/run-display/src',
                '**/packages/run-display/src/*',
              ],
              message:
                'Use the run-display package public entry (@aiwriter/run-display) instead of bridge or deep imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/run-display/src/run-display/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
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
              ],
              message:
                'run-display package boundary must not import host workflow-page/shared/runtime-controller modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/run-display/src/run/runDisplayContracts.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../../../src/shared/workflowSharedTypes',
                '**/src/shared/workflowSharedTypes',
              ],
              message:
                'run-display WorkflowState owner in package contracts must not import host shared/workflowSharedTypes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/workflow-editor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'components/workflow-page',
                'components/workflow-page/*',
                '**/components/workflow-page',
                '**/components/workflow-page/*',
                '@aiwriter/run-display',
                '@aiwriter/run-display/*',
                'packages/run-display/src/run-display',
                'packages/run-display/src/run-display/*',
                '**/packages/run-display/src/run-display',
                '**/packages/run-display/src/run-display/*',
              ],
              message:
                'workflow-editor boundary must not import workflow-page host modules or run-display internals.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/workflow-page/useWorkflowEditorPageAssembler.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../workflow-editor/domain',
                '../../workflow-editor/domain/*',
                '../../workflow-editor/state',
                '../../workflow-editor/state/*',
                '../../workflow-editor/actions',
                '../../workflow-editor/actions/*',
                '../../workflow-editor/operations',
                '../../workflow-editor/operations/*',
                '../../workflow-editor/controllers/useWorkflowBootstrap',
                '../../workflow-editor/controllers/useWorkflowGraphEditor',
                '../../workflow-editor/controllers/useWorkflowGraphEvents',
                '../../workflow-editor/controllers/useWorkflowGraphSelection',
                '../../workflow-editor/controllers/useWorkflowGraphState',
                '../../workflow-editor/controllers/useWorkflowPendingBinding',
                '../../workflow-editor/controllers/useWorkflowPersistence',
                '../../workflow-editor/controllers/useWorkflowRunInputs',
                '../../workflow-editor/controllers/useWorkflowSidecarStore',
                '../../workflow-editor/controllers/useWorkflowSubgraphTestStore',
              ],
              message:
                'workflow-page assembler must consume workflow-editor through the runtime facade and local section hooks only.',
            },
          ],
        },
      ],
    },
  },
])
