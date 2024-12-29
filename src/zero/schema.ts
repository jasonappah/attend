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

// User Schema
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

// Course Schema
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

// CourseSession Schema
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

// Complete Schema
export const schema = createSchema({
  version: 1,
  tables: {
    user: userSchema,
    course: courseSchema,
    courseSession: courseSessionSchema,
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

  const isOwnerOfCourse = (authData: AuthData, { cmp }: ExpressionBuilder<Tables['course']>) =>
    cmp('userId', '=', authData.sub)

  const isOwnerOfParentCourse = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Tables['courseSession']>
  ) => exists('course', ({ where }) => where('userId', '=', authData.sub))

  return {
    user: {
      row: {
        select: [isSelf],
        insert: NOBODY_CAN,
        update: NOBODY_CAN,
        delete: NOBODY_CAN,
      },
    },
    course: {
      row: {
        select: [isOwnerOfCourse],
        insert: [isOwnerOfCourse],
        update: {
          preMutation: [isOwnerOfCourse],
        },
        delete: [isOwnerOfCourse],
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
  }
})
