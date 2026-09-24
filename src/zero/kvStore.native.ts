import type { ZeroOptions } from '@rocicorp/zero'
import { expoSQLiteStoreProvider } from '@rocicorp/zero/expo-sqlite'

export const kvStore: ZeroOptions<any>['kvStore'] = expoSQLiteStoreProvider()
