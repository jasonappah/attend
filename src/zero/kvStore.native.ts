import type { ZeroOptions } from '@rocicorp/zero'
import { opSQLiteStoreProvider } from '@rocicorp/zero/op-sqlite'

// One bundles op-sqlite natively, so Zero can persist its replica locally
// without Expo. Web uses IndexedDB in kvStore.ts.
export const kvStore: ZeroOptions<any>['kvStore'] = opSQLiteStoreProvider()
