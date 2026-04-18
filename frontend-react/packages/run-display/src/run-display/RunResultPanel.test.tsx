// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RunResult } from '../run/runDisplayInputTypes'
import {
  buildDisplayRunFromDirectRun,
  RunResultPanel,
} from './index'

describe('RunResultPanel', () => {
  it('renders empty state when no run result is available', () => {
    render(<RunResultPanel displayRun={null} />)

    expect(screen.getByText('运行结果')).toBeTruthy()
    expect(screen.getByText('暂无运行结果')).toBeTruthy()
  })

  it('renders mapped run summary and steps as a smoke check', () => {
    const runResult: RunResult = {
      status: 'failed',
      run_scope: 'full',
      input_state: { topic: 'cats' },
      final_state: {},
      partial_state: { topic: 'cats', draft: 'partial' },
      steps: [
        {
          type: 'prompt',
          status: 'failed',
          node: 'prompt-1',
          inputs: { topic: 'cats' },
          rendered_prompt: 'Write about cats',
          error_message: 'Model failed',
          error_detail: 'Model failed\ntrace',
        },
      ],
      error_type: 'runtime_error',
      error_message: 'Execution failed',
      error_detail: 'Execution failed\ntrace',
      failure_stage: 'execution',
    }

    const displayRun = buildDisplayRunFromDirectRun(runResult)

    render(<RunResultPanel displayRun={displayRun} />)

    expect(screen.getByText('状态：')).toBeTruthy()
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0)
    expect(screen.getByText('运行失败摘要')).toBeTruthy()
    expect(screen.getByText('执行步骤')).toBeTruthy()
    expect(screen.getByText('运行状态总览')).toBeTruthy()
  })
})

