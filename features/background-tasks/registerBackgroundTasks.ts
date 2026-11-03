import { One } from 'one'
import { recordRun } from './localDb'
import { BACKGROUND_TASKS } from './tasks'

// define every handler at module scope of the native setup file: a background
// launch starts JavaScript without a window, so handlers registered in a
// component effect would not exist there.
//
// each handler records its own run, then re-submits itself at its interval.
// one submit schedules exactly one run, so this chain is what makes a task
// recurring; the run log is the source of truth for when the OS actually
// launched it.
export function registerBackgroundTasks() {
  for (const [identifier, intervalMs] of Object.entries(BACKGROUND_TASKS)) {
    One.BackgroundTasks.defineTask(identifier, async (invocation) => {
      const { signal } = invocation
      try {
        await recordRun(identifier)
      } catch (error) {
        // never let a recording failure take down the handler: report it and
        // keep the chain alive so the schedule keeps producing observations.
        console.error('[background tasks] failed to record run', identifier, error)
      }
      if (!signal.aborted) {
        await One.BackgroundTasks.submit(identifier, {
          earliestBeginDateMs: Date.now() + intervalMs,
        })
      }
    })
  }
}

// setupNative.ts imports this for its side effect: on native alone it
// registers every background-task handler before any foreground or background
// launch needs them.
registerBackgroundTasks()
