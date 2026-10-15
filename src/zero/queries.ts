import { defineQueries, defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from './schema.gen'

export const queries = defineQueries({
  user: defineQuery(({ ctx }) => zql.user.where('id', ctx?.userId ?? '').one()),

  courses: defineQuery(({ ctx }) =>
    zql.course.where('userId', ctx?.userId ?? '').orderBy('courseName', 'asc')
  ),

  sessions: defineQuery(({ ctx }) =>
    zql.courseSession
      .whereExists('course', (q) => q.where('userId', ctx?.userId ?? ''))
      .orderBy('startTime', 'asc')
  ),

  sessionsToday: defineQuery(
    z.object({
      start: z.number(),
      end: z.number(),
    }),
    ({ ctx, args: { start, end } }) =>
      zql.courseSession
        .where('startTime', '>=', start)
        .where('endTime', '<', end)
        .whereExists('course', (q) => q.where('userId', ctx?.userId ?? ''))
        .related('course', (q) => q.related('room'))
  ),

  calendars: defineQuery(({ ctx }) => zql.calendar.where('userId', ctx?.userId ?? '')),
})
