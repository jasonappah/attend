import type * as schema from './schema'
/**
 * @agent-rule
 * demo/world seed data — plain rows keyed by table name, in insert order
 * (FK parents before children). every row carries an explicit `seed-*` id, so
 * applying twice is a no-op (`INSERT ... ON CONFLICT DO NOTHING` per row) and a
 * grown seed set back-fills only the missing rows.
 *
 * this is DATA, not a program. keep it importable with ONLY stdlib,
 * `import type`, and the pure `../auth/demoIdentity.ts` constants when private
 * demo rows need the authenticated owner's id. use that exact relative path
 * with its `.ts` extension because deployed seed boot runs in plain node. no
 * project aliases, drizzle, or `db` imports. deployed boot and browser preview
 * both load this file after migrations with the same insert semantics.
 *
 * never seed a derived value: post.commentCount is an orez aggregate, so its
 * triggers count the comment rows below. seeding it too would double it.
 *
 * retheme: keep the shape (deterministic ids, parents before children,
 * instants as integer epoch milliseconds, calendar days as `YYYY-MM-DD` text,
 * money as integer cents, coded columns storing catalog ids) and swap
 * userPublic/post/comment for your own tables. content lives here once and is
 * shown to everyone, so make it good.
 */
import type { SeedData } from '@o/database'
import { DEMO_USER_ID } from '../auth/demoIdentity.ts'

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
const now = Date.now()
const epoch = (msAgo: number) => now - msAgo
const photo = (id: string) => `/seed-media/${id}.jpg`
const demo = process.env.NODE_ENV === 'development'
const today = new Date(now)
const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

export default {
  room: demo ? [
    {
      id: 'seed-attend-room', buildingCode: 'DEMO', roomNumber: '1.100',
      latitude: 32.985, longitude: -96.75, level: 2, concept3dMapId: 0,
      concept3dShape: null, concept3dCategoryName: 'Classrooms', concept3dLocationId: 0,
      concept3dCategoryId: 0, concept3dRoomId: 0, createdAt: now, updatedAt: null,
    },
  ] : [],
  course: demo ? [
    {
      id: 'seed-attend-course', userId: DEMO_USER_ID, calendarId: null,
      roomId: 'seed-attend-room', calendarEventName: 'Introduction to Computer Science',
      courseName: 'Introduction to Computer Science', calendarEventId: 'seed-attend-event',
      calendarEventLastModified: now, createdAt: now, updatedAt: null,
    },
  ] : [],
  courseSession: demo ? [
    {
      id: `seed-attend-session-${todayKey}`, courseId: 'seed-attend-course', attendance: null,
      startTime: new Date(new Date(now).setHours(10, 0, 0, 0)).getTime(),
      endTime: new Date(new Date(now).setHours(11, 0, 0, 0)).getTime(),
      createdAt: now, updatedAt: null,
    },
    {
      id: 'seed-attend-session-previous', courseId: 'seed-attend-course', attendance: 'present',
      startTime: new Date(new Date(now - 7 * DAY).setHours(10, 0, 0, 0)).getTime(),
      endTime: new Date(new Date(now - 7 * DAY).setHours(11, 0, 0, 0)).getTime(),
      createdAt: now, updatedAt: null,
    },
  ] : [],
  userPublic: [
    {
      id: 'seed-user-maya',
      name: 'Maya Okafor',
      username: 'maya',
      image: null,
      joinedAt: epoch(40 * DAY),
    },
    {
      id: 'seed-user-arlo',
      name: 'Arlo Chen',
      username: 'arlo',
      image: null,
      joinedAt: epoch(32 * DAY),
    },
    {
      id: 'seed-user-nova',
      name: 'Nova Reyes',
      username: 'nova',
      image: null,
      joinedAt: epoch(21 * DAY),
    },
  ],
  post: [
    {
      id: 'seed-post-0',
      userId: 'seed-user-maya',
      image: photo('seed-post-0'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Morning light over the bay',
      createdAt: epoch(2 * HOUR),
    },
    {
      id: 'seed-post-1',
      userId: 'seed-user-arlo',
      image: photo('seed-post-1'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Found this little cafe downtown',
      createdAt: epoch(1 * DAY),
    },
    {
      id: 'seed-post-2',
      userId: 'seed-user-nova',
      image: photo('seed-post-2'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Trail run before the heat',
      createdAt: epoch(2 * DAY),
    },
    {
      id: 'seed-post-3',
      userId: 'seed-user-maya',
      image: photo('seed-post-3'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Weekend market haul',
      createdAt: epoch(3 * DAY),
    },
    {
      id: 'seed-post-4',
      userId: 'seed-user-arlo',
      image: photo('seed-post-4'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Sketching in the park',
      createdAt: epoch(4 * DAY),
    },
    {
      id: 'seed-post-5',
      userId: 'seed-user-nova',
      image: photo('seed-post-5'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Late-night city walk',
      createdAt: epoch(5 * DAY),
    },
  ],
  comment: [
    {
      id: 'seed-comment-0',
      postId: 'seed-post-0',
      userId: 'seed-user-arlo',
      content: 'So good!',
      createdAt: epoch(1 * HOUR),
    },
    {
      id: 'seed-comment-1',
      postId: 'seed-post-0',
      userId: 'seed-user-nova',
      content: 'Love this one 🙌',
      createdAt: epoch(30 * MINUTE),
    },
    {
      id: 'seed-comment-2',
      postId: 'seed-post-1',
      userId: 'seed-user-maya',
      content: 'Adding this to my list',
      createdAt: epoch(20 * HOUR),
    },
  ],
} satisfies SeedData<typeof schema>
