/**
 * Background tasks used to observe how the operating system schedules
 * background work. each identifier is submitted once, then re-submits itself
 * from its handler at its interval, so the `backgroundTaskRun` log shows when
 * the OS actually launched each task rather than when we asked for it.
 *
 * All four are refresh tasks: each run is a single SQLite insert, so none of
 * them needs network or charging constraints. the intervals below are what we
 * ask for — the OS decides the real delivery time, which is exactly what this
 * feature exists to measure.
 */
export const BACKGROUND_TASKS = {
  // one run per minute
  'attend.background-task.every-minute': 60_000,
  // one run per ten minutes
  'attend.background-task.every-ten-minutes': 600_000,
  // one run per hour
  'attend.background-task.every-hour': 3_600_000,
  // one run per thirty minutes
  'attend.background-task.every-thirty-minutes': 1_800_000,
} as const satisfies Record<string, number>

export type BackgroundTaskIdentifier = keyof typeof BACKGROUND_TASKS
