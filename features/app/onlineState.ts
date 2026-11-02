/**
 * A single source of truth for whether the device is online, shared between
 * React (OnlineProvider) and non-React code (the tRPC link and direct Zero
 * mutation call sites).
 *
 * A tRPC link and ordinary functions can't call a React hook, so they read
 * this module-level flag. OnlineProvider keeps the flag in sync with
 * `useNetworkState`. It defaults to online so a brief monitor warm-up on
 * native never blocks writes at startup.
 */

let online = typeof navigator === 'undefined' ? true : navigator.onLine

export function getOnline() {
  return online
}

export function setOnline(value: boolean) {
  online = value
}
