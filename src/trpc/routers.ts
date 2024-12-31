import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { add } from 'date-fns'
import { eq } from 'drizzle-orm'
import ical, { type VEvent } from 'node-ical'
import { calendar, course, courseSession } from '~/db/schema'
import { randomID } from '~/zero/randomID'
import { authedProcedure, publicProcedure, router } from './index'
import { logger } from './logger'

const coursesRouter = router({
  addCoursesFromIcs: authedProcedure.query(async ({ ctx }) => {
    // TODO: take in calendar id as an argument
    // TODO: also consider doing this client side / as a background task

    const [calendarFromDb] = await ctx.db
      .select()
      .from(calendar)
      .where(eq(calendar.userId, ctx.session.user.id))
      .limit(1)

    if (!calendarFromDb) {
      logger.error('no calendar in db for current user')
      return
    }

    const ics = await ical.async.fromURL(calendarFromDb.upstreamUrl)

    // TODO: maybe need to have a concept of semesters
    const classStartDate = new Date(2024, 7, 1)
    const classEndDate = new Date(2024, 11, 31)

    const dateInRange = (date: Date) => date > classStartDate && date < classEndDate

    const icsEventsForFall2024Courses = Object.fromEntries(
      (Object.entries(ics).filter(([, item]) => item.type === 'VEVENT') as [string, VEvent][])
        .filter(([, evt]) => dateInRange(evt.start))
        .filter(([, evt]) => evt.summary.match(/^\w{2,4} \d{4} \d{3}/))
    )

    const insertedCourses = await ctx.db
      .insert(course)
      .values(
        Object.values(icsEventsForFall2024Courses).map((evt) => ({
          id: randomID(),
          name: evt.summary,
          createdAt: new Date(),
          updatedAt: null,
          userId: ctx.session.user.id,
          calendarId: calendarFromDb.id,
          calendarEventId: evt.uid,
        }))
      )
      .returning({
        insertedId: course.id,
        calendarEventId: course.calendarEventId,
      })
      .onConflictDoUpdate({
        target: course.calendarEventId,
        set: {
          name: course.name,
        },
      })

    for (const course of insertedCourses) {
      if (!course.calendarEventId) {
        logger.warn('Missing calendarEventId', course)
        continue
      }
      const evt = icsEventsForFall2024Courses[course.calendarEventId]
      if (!evt.rrule) {
        logger.trace('Missing rrule', evt)
        continue
      }

      const durationSeconds = (evt.end.getTime() - evt.start.getTime()) / 1000

      const instances = evt.rrule.all()

      await ctx.db
        .insert(courseSession)
        .values(
          instances.map((instance) => ({
            id: randomID(),
            courseId: course.insertedId,
            createdAt: new Date(),
            updatedAt: null,
            startTime: instance,
            endTime: add(instance, { seconds: durationSeconds }),
          }))
        )
        .onConflictDoNothing()
    }
  }),
})

export const appRouter = router({
  courses: coursesRouter,
})

export type AppRouter = typeof appRouter

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
