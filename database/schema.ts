/**
 * @agent-rule
 * Store dates as integer epoch milliseconds. Private Better Auth columns use
 * `mode: 'timestamp_ms'` at the Drizzle boundary; synced columns stay numbers
 * end to end so Zero mutations and filters use `Date.now()` values directly.
 * Store money as integer cents in a column named for its unit
 * (`integer('amountCents')`), never `real`; `real` is for other fractional
 * values. A text column that stores a machine id (a status, a category, a
 * slug) has one id-to-label catalog exported from its `data/<table>/` module,
 * which the seed, the pickers, and every screen share.
 */
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// ─── private tables (auth — NOT synced to zero) ───

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  role: text('role').default('user').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey().notNull(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
    mode: 'timestamp_ms',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey().notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey().notNull(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey().notNull(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
})

// one row per background task run. written by the background-task handlers
// from a headless JavaScript launch, so this never leaves the device and is
// deliberately not part of the Zero schema: it is diagnostic data for
// observing how promptly the OS launches each task, exported through the
// diagnostics screen rather than synced.
export const backgroundTaskRun = sqliteTable('backgroundTaskRun', {
  id: text('id').primaryKey(),
  // the submitted task identifier, e.g. attend.background-task.every-minute
  task: text('task').notNull(),
  ranAt: integer('ranAt').notNull(),
  // system snapshot captured at the moment the task ran. batteryLevel is 0
  // to 1, or -1 when the device reports no level. batteryState is unknown,
  // unplugged, charging, full, or notCharging. lowPowerMode is Power Saver
  // on Android and Low Power Mode on iOS. device fields are the OS snapshot;
  // isSimulator is true only on simulator/emulator hardware.
  batteryLevel: integer('batteryLevel'),
  batteryState: text('batteryState'),
  lowPowerMode: integer('lowPowerMode', { mode: 'boolean' }),
  deviceModel: text('deviceModel'),
  deviceSystemName: text('deviceSystemName'),
  deviceSystemVersion: text('deviceSystemVersion'),
  isSimulator: integer('isSimulator', { mode: 'boolean' }),
})

// ─── public tables (synced to zero) ───

export const userPublic = sqliteTable(
  'userPublic',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    username: text('username'),
    image: text('image'),
    joinedAt: integer('joinedAt').notNull(),
  },
  (table) => [index('userPublic_username_idx').on(table.username)]
)

export const post = sqliteTable(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    image: text('image').notNull(),
    imageWidth: integer('imageWidth'),
    imageHeight: integer('imageHeight'),
    caption: text('caption'),
    commentCount: integer('commentCount').notNull().default(0),
    createdAt: integer('createdAt').notNull(),
  },
  (table) => [
    index('post_userId_idx').on(table.userId),
    index('post_createdAt_id_idx').on(table.createdAt, table.id),
  ]
)

export const comment = sqliteTable(
  'comment',
  {
    id: text('id').primaryKey(),
    postId: text('postId').notNull(),
    userId: text('userId').notNull(),
    content: text('content').notNull(),
    createdAt: integer('createdAt').notNull(),
  },
  (table) => [
    index('comment_postId_idx').on(table.postId),
    index('comment_postId_createdAt_idx').on(table.postId, table.createdAt),
    index('comment_userId_idx').on(table.userId),
  ]
)

// one durable row per notification event. the inbox is the authority: a
// suppressed toast or a disabled system push changes only how the event is
// presented, never whether it was recorded. `readAt` is a timestamp rather
// than a flag so "when did the user read this" survives.
export const appNotification = sqliteTable(
  'appNotification',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    workflow: text('workflow').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    // a typed logical target, never a url. web and native each resolve the kind
    // through their own router, and an unknown kind opens the inbox instead.
    destinationKind: text('destinationKind').notNull(),
    destinationId: text('destinationId'),
    createdAt: integer('createdAt').notNull(),
    readAt: integer('readAt'),
  },
  (table) => [
    index('appNotification_userId_readAt_createdAt_idx').on(
      table.userId,
      table.readAt,
      table.createdAt
    ),
    index('appNotification_userId_createdAt_id_idx').on(table.userId, table.createdAt, table.id),
  ]
)

// per-user, per-workflow presentation preferences. a missing row means the
// workflow's own defaults apply, so a new workflow needs no backfill.
export const notificationPreference = sqliteTable(
  'notificationPreference',
  {
    userId: text('userId').notNull(),
    workflow: text('workflow').notNull(),
    foregroundToastEnabled: integer('foregroundToastEnabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    systemPushEnabled: integer('systemPushEnabled', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updatedAt').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workflow] })]
)

// Attend's synced records use epoch milliseconds, like the rest of Takeout.
export const calendar = sqliteTable('calendar', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  upstreamUrl: text('upstreamUrl').notNull().unique(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt'),
})

export const room = sqliteTable(
  'room',
  {
    id: text('id').primaryKey(),
    buildingCode: text('buildingCode').notNull(),
    roomNumber: text('roomNumber').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    level: integer('level').notNull(),
    concept3dMapId: integer('concept3dMapId').notNull(),
    concept3dShape: text('concept3dShape'),
    concept3dCategoryName: text('concept3dCategoryName').notNull(),
    concept3dLocationId: integer('concept3dLocationId').notNull(),
    concept3dCategoryId: integer('concept3dCategoryId').notNull(),
    concept3dRoomId: integer('concept3dRoomId').notNull(),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt'),
  },
  (table) => [uniqueIndex('room_building_room_idx').on(table.buildingCode, table.roomNumber)]
)

export const course = sqliteTable('course', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  calendarId: text('calendarId').references(() => calendar.id, { onDelete: 'set null' }),
  roomId: text('roomId')
    .notNull()
    .references(() => room.id),
  calendarEventName: text('calendarEventName').notNull(),
  courseName: text('courseName').notNull(),
  calendarEventId: text('calendarEventId').notNull().unique(),
  calendarEventLastModified: integer('calendarEventLastModified').notNull(),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt'),
})

export const courseSession = sqliteTable(
  'courseSession',
  {
    id: text('id').primaryKey(),
    courseId: text('courseId')
      .notNull()
      .references(() => course.id),
    attendance: text('attendance', { enum: ['present', 'absent'] }),
    startTime: integer('startTime').notNull(),
    endTime: integer('endTime').notNull(),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt'),
  },
  (table) => [
    uniqueIndex('courseSession_course_times_idx').on(
      table.courseId,
      table.endTime,
      table.startTime
    ),
  ]
)
