import {
  type ExpressionBuilder,
  NOBODY_CAN,
  type TableSchema,
  column,
  createSchema,
  createTableSchema,
  definePermissions,
} from '@rocicorp/zero'
import type { Attendance } from '~/db/schema'
const { enumeration } = column

const userSchema = createTableSchema({
  tableName: 'user',
  columns: {
    id: 'string',
    name: 'string',
    email: 'string',
    emailVerified: 'boolean',
    image: { type: 'string', optional: true },
    createdAt: 'number',
    updatedAt: 'number',
  },
  primaryKey: 'id',
})

const calendarSchema = createTableSchema({
  tableName: 'calendar',
  columns: {
    id: 'string',
    upstreamUrl: 'string',
    createdAt: 'number',
    updatedAt: 'number',
    userId: 'string',
  },
  primaryKey: 'id',
  relationships: {
    user: {
      sourceField: 'userId',
      destSchema: userSchema,
      destField: 'id',
    },
  },
})

const courseSchema = createTableSchema({
  tableName: 'course',
  columns: {
    id: 'string',
    name: 'string',
    createdAt: 'number',
    updatedAt: 'number',
    userId: 'string',
  },
  primaryKey: 'id',
  relationships: {
    user: {
      sourceField: 'userId',
      destSchema: userSchema,
      destField: 'id',
    },
  },
})

const courseSessionSchema = createTableSchema({
  tableName: 'courseSession',
  columns: {
    id: 'string',
    courseId: 'string',
    createdAt: 'number',
    updatedAt: 'number',
    attendance: enumeration<Attendance>(),
  },
  primaryKey: 'id',
  relationships: {
    course: {
      sourceField: 'courseId',
      destSchema: courseSchema,
      destField: 'id',
    },
  },
})

export const schema = createSchema({
  version: 1,
  tables: {
    user: userSchema,
    course: courseSchema,
    courseSession: courseSessionSchema,
    calendar: calendarSchema,
  },
})

// Define the structure of your JWT auth data
type AuthData = {
  sub: string // user id
  email: string
  roles?: string[]
}

type Schema = typeof schema
type Tables = Schema['tables']

export const permissions = definePermissions<AuthData, Schema>(schema, async () => {
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
