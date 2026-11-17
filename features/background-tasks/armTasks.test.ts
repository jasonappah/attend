import { describe, expect, it, mock } from 'bun:test'
import { armBackgroundTasks } from './armTasks'

describe('armBackgroundTasks', () => {
  it('waits for every task and reports failures with their identifiers', async () => {
    const submit = mock(async (identifier: string) => {
      if (identifier === 'bad') throw new Error('identifier is not configured')
    })
    expect(await armBackgroundTasks(['good', 'bad', 'also-good'], submit)).toEqual([
      { identifier: 'bad', message: 'identifier is not configured' },
    ])
    expect(submit).toHaveBeenCalledTimes(3)
  })

  it('returns no failures when all submissions succeed', async () => {
    expect(await armBackgroundTasks(['good'], async () => {})).toEqual([])
  })

  it('captures synchronous failures and native error codes', async () => {
    const submit = (identifier: string): Promise<void> => {
      if (identifier === 'bad') throw { code: 'E_BACKGROUND_TASK_INPUT', message: 'not configured' }
      return Promise.resolve()
    }
    expect(await armBackgroundTasks(['bad', 'good'], submit)).toEqual([
      { identifier: 'bad', message: 'E_BACKGROUND_TASK_INPUT: not configured' },
    ])
  })
})
