import {
  type ExpressionBuilder,
  NOBODY_CAN,
  type Row,
  type TableSchema,
  definePermissions,
} from '@rocicorp/zero'
import { schema, type Schema } from "./schema.gen";


// Define the structure of your JWT auth data
type AuthData = {
  sub: string // user id
  email: string
  roles?: string[]
}

type Tables = Schema['tables']

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const _isAuthenticated = (authData: AuthData, { cmpLit }: ExpressionBuilder<TableSchema>) =>
    cmpLit(authData.sub, 'IS NOT', null)

  const isSelf = (authData: AuthData, { cmp }: ExpressionBuilder<Tables['user']>) =>
    cmp('id', '=', authData.sub)

  const isOwner = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Tables['course'] | Tables['calendar']>
  ) => cmp('userId', '=', authData.sub)

  const isOwnerOfParentCourse = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Tables['courseSession']>
  ) => exists('course', (b) => b.where('userId', '=', authData.sub))

  return {
    user: {
      row: {
        select: [isSelf],
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN,
        },
        delete: NOBODY_CAN,
      },
    },
    course: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },

    courseSession: {
      row: {
        select: [isOwnerOfParentCourse],
        insert: [isOwnerOfParentCourse],
        update: {
          preMutation: [isOwnerOfParentCourse],
        },
        delete: [isOwnerOfParentCourse],
      },
    },
    calendar: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },
  }
})

export type User = Row<typeof schema.tables.user>
export type Course = Row<typeof schema.tables.course>
export type CourseSession = Row<typeof schema.tables.courseSession>
export type Room = Row<typeof schema.tables.room>

export type {Schema}
export {schema}