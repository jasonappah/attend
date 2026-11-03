/**
 * Background tasks used to observe how the operating system schedules
 * background work. each identifier is submitted once, then re-submits
 * itself from its handler at its interval, so the backgroundTaskRun log
 * shows when the OS actually launched each task rather than when we asked
 * for it.
 *
 * record tasks only write their run to the local database. ping tasks do
 * the same but also fetch google.com first, so we can tell whether a
 * refresh task had network access when it ran — that's the extra signal
 * for testing whether refresh tasks actually fire on time.
 *
 * intervals are what we ask for — the OS decides real delivery.
 */
export type BackgroundTaskKind = 'record' | 'ping'

export const BACKGROUND_TASKS: Record<
  string,
  { intervalMs: number; kind: BackgroundTaskKind }
> = {
  // record tasks — just log the run
  'attend.background-task.every-minute': {
    intervalMs: 60_000,
    kind: 'record',
  },
  'attend.background-task.every-ten-minutes': {
    intervalMs: 600_000,
    kind: 'record',
  },
  'attend.background-task.every-hour': {
    intervalMs: 3_600_000,
    kind: 'record',
  },
  'attend.background-task.every-thirty-minutes': {
    intervalMs: 1_800_000,
    kind: 'record',
  },
  // ping tasks — same intervals, but each run fetches google.com first
  'attend.background-task.every-minute-ping': {
    intervalMs: 60_000,
    kind: 'ping',
  },
  'attend.background-task.every-ten-minutes-ping': {
    intervalMs: 600_000,
    kind: 'ping',
  },
  'attend.background-task.every-hour-ping': {
    intervalMs: 3_600_000,
    kind: 'ping',
  },
  'attend.background-task.every-thirty-minutes-ping': {
    intervalMs: 1_800_000,
    kind: 'ping',
  },
} as const satisfies Record<
  string,
  { intervalMs: number; kind: BackgroundTaskKind }
>

export type BackgroundTaskIdentifier = keyof typeof BACKGROUND_TASKS

export const RECORD_TASK_IDENTIFIERS = Object.entries(BACKGROUND_TASKS)
  .filter(([, { kind }]) => kind === 'record')
  .map(([id]) => id)

export const PING_TASK_IDENTIFIERS = Object.entries(BACKGROUND_TASKS)
  .filter(([, { kind }]) => kind === 'ping')
  .map(([id]) => id)
