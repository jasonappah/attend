import type { ZeroOptions } from '@rocicorp/zero'

// web uses IndexedDB, native overrides this in kvStore.native.ts
export const kvStore: ZeroOptions<any>['kvStore'] = 'idb'
