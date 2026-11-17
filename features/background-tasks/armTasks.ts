export type TaskSubmissionFailure = {
  identifier: string
  message: string
}

// Wait for every submission: one rejected task does not undo the others.
export async function armBackgroundTasks(
  identifiers: string[],
  submit: (identifier: string) => Promise<void>
): Promise<TaskSubmissionFailure[]> {
  const results = await Promise.allSettled(
    identifiers.map(async (identifier) => submit(identifier))
  )
  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return []
    const error: unknown = result.reason
    const detail =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : String(error)
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
    const message = typeof code === 'string' ? `${code}: ${detail}` : detail
    console.error('[background tasks] failed to submit task', identifiers[index], error)
    return [{ identifier: identifiers[index], message }]
  })
}
