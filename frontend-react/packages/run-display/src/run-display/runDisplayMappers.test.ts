import { describe, expect, it } from 'vitest'

import type { LiveRunSnapshot, RunResult } from '../run/runDisplayInputTypes'
import {
  buildDisplayRunFromDirectRun,
  buildDisplayRunFromLiveSnapshot,
} from './index'

describe('runDisplayMappers', () => {
  it('maps direct failed run result into stable display model fields', () => {
    const runResult: RunResult = {
      status: 'failed',
      run_scope: 'full',
      input_state: { topic: 'cats' },
      final_state: {},
      partial_state: { topic: 'cats', draft: 'partial' },
      steps: [
        {
          type: 'input',
          status: 'success',
          node: 'input-1',
          output: 'cats',
          published_state: { topic: 'cats' },
        },
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
      error_message: 'Execution failed at prompt node',
      error_detail: 'Execution failed at prompt node\ntrace-id=abc',
      failure_stage: 'execution',
    }

    const displayRun = buildDisplayRunFromDirectRun(runResult, {
      isStale: true,
    })

    expect(displayRun.source).toBe('direct')
    expect(displayRun.status).toBe('failed')
    expect(displayRun.runScope).toBe('full')
    expect(displayRun.failureStage).toBe('execution')
    expect(displayRun.primaryStateTitle).toBe('Partial State Before Failure')
    expect(displayRun.primaryState).toEqual({ topic: 'cats', draft: 'partial' })
    expect(displayRun.failureInfo?.summary).toBe('Execution failed at prompt node')
    expect(displayRun.failureInfo?.detail).toContain('trace-id=abc')
    expect(displayRun.failureInfo?.failedNode).toBe('prompt-1')
    expect(displayRun.isStale).toBe(true)
  })

  it('maps live running snapshot and keeps live metadata', () => {
    const snapshot: LiveRunSnapshot = {
      run_id: 'live-1',
      canvas_id: 'article',
      status: 'running',
      run_scope: 'full',
      active_node_id: 'prompt-1',
      input_state: { topic: 'cats' },
      current_state: { topic: 'cats', context: 'expanded' },
      final_state: {},
      partial_state: null,
      steps: [
        {
          type: 'input',
          status: 'success',
          node: 'input-1',
          output: 'cats',
          published_state: { topic: 'cats' },
        },
      ],
    }

    const displayRun = buildDisplayRunFromLiveSnapshot(snapshot)

    expect(displayRun.source).toBe('live')
    expect(displayRun.status).toBe('running')
    expect(displayRun.isLive).toBe(true)
    expect(displayRun.runId).toBe('live-1')
    expect(displayRun.activeNodeId).toBe('prompt-1')
    expect(displayRun.primaryStateTitle).toBe('Current Live State')
    expect(displayRun.primaryState).toEqual({ topic: 'cats', context: 'expanded' })
    expect(displayRun.failureInfo).toBeNull()
  })

  it('maps live failed snapshot without drifting failure-stage and error fields', () => {
    const snapshot: LiveRunSnapshot = {
      run_id: 'live-2',
      canvas_id: 'article',
      status: 'failed',
      run_scope: 'full',
      input_state: { topic: 'cats' },
      current_state: { topic: 'cats', progress: '50%' },
      final_state: {},
      partial_state: { topic: 'cats', progress: '50%' },
      steps: [
        {
          type: 'prompt',
          status: 'failed',
          node: 'prompt-2',
          inputs: { topic: 'cats' },
          rendered_prompt: 'Continue',
          error_message: 'Tool timeout',
          error_detail: 'Tool timeout\nrequest=42',
        },
      ],
      error_type: 'timeout_error',
      error_message: 'Tool timeout',
      error_detail: 'Tool timeout\nrequest=42',
      failure_stage: 'execution',
    }

    const displayRun = buildDisplayRunFromLiveSnapshot(snapshot)

    expect(displayRun.status).toBe('failed')
    expect(displayRun.failureStage).toBe('execution')
    expect(displayRun.primaryStateTitle).toBe('Partial State Before Failure')
    expect(displayRun.primaryState).toEqual({ topic: 'cats', progress: '50%' })
    expect(displayRun.failureInfo?.summary).toBe('Tool timeout')
    expect(displayRun.failureInfo?.detail).toContain('request=42')
    expect(displayRun.failureInfo?.failedNode).toBe('prompt-2')
  })
})

