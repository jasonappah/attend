type UpdateClient = {
  readonly isEnabled: boolean
  fetch(): Promise<unknown>
}

// One stages fetched bytes for selection by its launcher on the next cold start.
// Never reload or substitute staged metadata for the running update snapshot.
export function createNativeUpdateCoordinator(
  updates: UpdateClient,
  isDevelopment: boolean,
  onError: (error: unknown) => void = () => {}
) {
  let started = false
  return function start(): void {
    if (started || isDevelopment || !updates.isEnabled) return
    started = true
    // Deferral also catches a synchronous bridge failure without blocking mount.
    void Promise.resolve()
      .then(() => updates.fetch())
      .catch((error) => {
        try {
          onError(error)
        } catch {
          /* Diagnostics must not break startup. */
        }
      })
  }
}
