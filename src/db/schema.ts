import { defineRelations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { z } from 'zod'

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().$onUpdate(() => new Date()),
} as const

export const user = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  ...timestamps,
})

export const session = pgTable('session', {
  id: uuid('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  ...timestamps,
})

export const account = pgTable('account', {
  id: uuid('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  ...timestamps,
})

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

export const jwks = pgTable('jwks', {
  id: uuid('id').primaryKey(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  expiresAt: timestamp('expiresAt'),
  alg: text('alg'),
  crv: text('crv'),
})

export const course = pgTable('course', {
  id: uuid('id').primaryKey(),
  calendarEventName: text('calendarEventName').notNull(),
  courseName: text('courseName').notNull(),
  roomId: uuid('roomId')
    .notNull()
    .references(() => room.id),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  calendarId: uuid('calendarId').references(() => calendar.id, { onDelete: 'set null' }),
  calendarEventId: text('calendarEventId').unique().notNull(),
  calendarEventLastModified: timestamp('calendarEventLastModified').notNull(),
  ...timestamps,
})

export const attendanceEnum = pgEnum('attendance', ['present', 'absent'])

export type Attendance = (typeof attendanceEnum)['enumValues'][number]

export const courseSession = pgTable(
  'courseSession',
  {
    id: uuid('id').primaryKey(),
    courseId: uuid('courseId')
      .notNull()
      .references(() => course.id),
    ...timestamps,
    attendance: attendanceEnum('attendance'),
    startTime: timestamp('startTime').notNull(),
    endTime: timestamp('endTime').notNull(),
  },
  (t) => [unique().on(t.courseId, t.endTime, t.startTime)]
)

export const calendar = pgTable('calendar', {
  id: uuid('id').primaryKey(),
  upstreamUrl: text('upstreamUrl').notNull().unique(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  ...timestamps,
})

const GPSCoordinateSchema = z.tuple([z.number(), z.number()])

export const Concept3DShapeSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('polygon'),
      paths: z.array(GPSCoordinateSchema),
    })
    .strip(),
  z
    .object({
      type: z.literal('rectangle'),
      bounds: z.array(GPSCoordinateSchema),
    })
    .strip(),
])

export type Concept3DShape = z.infer<typeof Concept3DShapeSchema>

export const room = pgTable(
  'room',
  {
    id: uuid('id').primaryKey(),
    buildingCode: text('buildingCode').notNull(),
    roomNumber: text('roomNumber').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    level: integer('level').notNull(),

    concept3dMapId: integer('concept3dMapId').notNull(),
    concept3dShape: jsonb().$type<Concept3DShape>(),
    concept3dCategoryName: text('concept3dCategoryName').notNull(),
    concept3dLocationId: integer('concept3dLocationId').notNull(),
    concept3dCategoryId: integer('concept3dCategoryId').notNull(),
    concept3dMarkId: integer('concept3dRoomId').notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.buildingCode, t.roomNumber)]
)

export const relations = defineRelations(
  { user, session, account, verification, jwks, course, courseSession, calendar, room },
  (r) => ({
    user: {
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      courses: r.many.course({
        from: r.user.id,
        to: r.course.userId,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    course: {
      user: r.one.user({
        from: r.course.userId,
        to: r.user.id,
      }),
      room: r.one.room({
        from: r.course.roomId,
        to: r.room.id,
      }),
    },
    courseSession: {
      course: r.one.course({
        from: r.courseSession.courseId,
        to: r.course.id,
      }),
    },
    calendar: {
      user: r.one.user({
        from: r.calendar.userId,
        to: r.user.id,
      }),
    },
  })
)
