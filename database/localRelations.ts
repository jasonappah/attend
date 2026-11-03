/**
 * Relations for the local device-only schema. background_task_run has no
 * foreign-key relationships, so this is an empty defineRelations object.
 */
import { defineRelations } from 'drizzle-orm'
import * as schema from './localSchema'

export const relations = defineRelations(schema, () => ({}))
