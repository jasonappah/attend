import type { Row } from '@rocicorp/zero'
import { type Schema, schema, zql } from './schema.gen'

export type User = Row<typeof schema.tables.user>
export type Course = Row<typeof schema.tables.course>
export type CourseSession = Row<typeof schema.tables.courseSession>
export type Room = Row<typeof schema.tables.room>
export type Calendar = Row<typeof schema.tables.calendar>

export type { Schema }
export { schema, zql }
