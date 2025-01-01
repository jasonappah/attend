import { relations, sql } from 'drizzle-orm'
import { boolean, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp(),
}

export const user = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  ...timestamps,
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  courses: many(course),
  courseSessions: many(courseSession),
}))

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

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

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

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

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
})

export const course = pgTable('course', {
  id: uuid('id').primaryKey(),
  calendarEventName: text('calendarEventName').notNull(),
  courseName: text('courseName').notNull(),
  roomNumber: text('roomNumber').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  calendarId: uuid('calendarId')
    .references(() => calendar.id)
    .notNull(),
  calendarEventId: text('calendarEventId').unique().notNull(),
  calendarEventLastModified: timestamp('calendarEventLastModified').notNull(),
  ...timestamps,
})

export const courseRelations = relations(course, ({ one }) => ({
  user: one(user, {
    fields: [course.userId],
    references: [user.id],
  }),
}))

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
  (t) => ({
    noDuplicateSessions: unique().on(t.courseId, t.endTime, t.startTime),
  })
)

export const courseSessionRelations = relations(courseSession, ({ one }) => ({
  course: one(course, {
    fields: [courseSession.courseId],
    references: [course.id],
  }),
}))

export const calendar = pgTable('calendar', {
  id: uuid('id').primaryKey(),
  upstreamUrl: text('upstreamUrl').notNull().unique(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  ...timestamps,
})

export const calendarRelations = relations(calendar, ({ one }) => ({
  user: one(user, {
    fields: [calendar.userId],
    references: [user.id],
  }),
}))



export const room = pgTable('room', {
  id: uuid('id').primaryKey(),
  buildingCode: text('building').notNull(),
  roomNumber: text('roomNumber').notNull(),
  latitude: numeric('latitude').notNull(),
  longitude: numeric('longitude').notNull(),
  level: integer('level').notNull(),
  
  concept3dMapId: integer('concept3dMapId').notNull(),
  concept3dPaths: jsonb().$type<[number, number][]>().default(sql`'[]'::jsonb`),
  concept3dCategoryName: text('concept3dCategoryName').notNull(),
  concept3dCategoryId: text('concept3dCategoryId').notNull(),
  concept3dMarkId: integer('concept3dRoomId').notNull(),
  ...timestamps,
})

// TODO: link courses to rooms