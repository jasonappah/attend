/**
 * Device connectivity, via One's `useNetworkState`.
 *
 * One's hook reports the system's idea of the connection right now
 * (Wi-Fi, cellular, none, …) and calls back when it changes. On native it
 * starts as `unknown` before the first reading arrives, so we treat anything
 * that isn't `none` as online: we'd rather let a brief startup write attempt
 * go than block everything while the monitor warms up.
 *
 * Reads are local-first through Zero and keep working offline. Writes — Zero
 * mutations and tRPC calls — are gated on being online.
 *
 * See https://onestack.dev/native/network
 */
import { useNetworkState } from 'one'

export type ConnectionType =
  | 'none'
  | 'unknown'
  | 'cellular'
  | 'wifi'
  | 'bluetooth'
  | 'ethernet'
  | 'wimax'
  | 'vpn'
  | 'other'

export type ConnectionState = {
  type: ConnectionType
  isConnected: boolean
  isInternetReachable: boolean
}

/** True when the system reports a connection that is not `none`. */
export function useOnline() {
  const { type } = useNetworkState()
  return type !== 'none'
}

export function useConnectionStatus(): ConnectionState {
  const { type, isConnected, isInternetReachable } = useNetworkState()
  return { type, isConnected, isInternetReachable }
}

export function isOffline(state: ConnectionState) {
  return state.type === 'none'
}
