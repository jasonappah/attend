import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { add } from 'date-fns'
import { and, eq, inArray, sql } from 'drizzle-orm'
import ical, { type VEvent } from 'node-ical'
import type { Db } from '~/db'
import { calendar, course, courseSession } from '~/db/schema'
import { randomID } from '~/zero/randomID'
import { authedProcedure, router } from './index'
import { logger } from './logger'

const coursesRouter = router({
  addCoursesFromIcs: authedProcedure.mutation(async ({ ctx }) => {
    // TODO: also consider doing this client side / as a background task

    const calendarsFromDb = await ctx.db
      .select()
      .from(calendar)
      .where(eq(calendar.userId, ctx.session.user.id))

    if (calendarsFromDb.length === 0) {
      logger.error('no calendar in db for current user')
      return
    }

    await Promise.all(calendarsFromDb.map((cal) => syncCoursesFromCalendar(cal, ctx.db)))

    return true
  }),
})

function getCourseDetailsFromIcsEvent(evt: VEvent) {
  const matches = evt.summary.match(/^(\w{2,4} \d{4} \d{3}) - (.*)$/)
  if (!matches) return null
  return {
    courseName: matches[1],
    roomNumber: matches[2],
  }
}

type CourseDetails = NonNullable<ReturnType<typeof getCourseDetailsFromIcsEvent>>

const syncCoursesFromCalendar = async (
  calendarFromDb: {
    id: string
    upstreamUrl: string
    userId: string
  },
  db: Db
) => {
  const ics = await ical.async.fromURL(calendarFromDb.upstreamUrl)

  // TODO: maybe need to have a concept of semesters
  const classStartDate = new Date(2024, 7, 1)
  const classEndDate = new Date(2024, 11, 31)

  const dateInRange = (date: Date) => date > classStartDate && date < classEndDate

  type Out = [string, VEvent & { details: CourseDetails }][]
  const icsEventsForFall2024Courses = Object.fromEntries(
    (Object.entries(ics).filter(([, item]) => item.type === 'VEVENT') as [string, VEvent][])
      .filter(([, evt]) => dateInRange(evt.start))
      .reduce((acc, [key, evt]) => {
        const details = getCourseDetailsFromIcsEvent(evt)
        if (!details) return acc

        return [...acc, [key, { ...evt, details }]] as Out
      }, [] as Out)
  )

  if (Object.keys(icsEventsForFall2024Courses).length === 0) {
    logger.warn('No courses found in ics')
    return
  }

  const insertedCourses = await db
    .insert(course)
    .values(
      Object.values(icsEventsForFall2024Courses).map((evt) => ({
        id: randomID(),
        calendarEventName: evt.summary,
        createdAt: new Date(),
        updatedAt: null,
        userId: calendarFromDb.userId,
        calendarId: calendarFromDb.id,
        calendarEventId: evt.uid,
        calendarEventLastModified: evt.lastmodified,
        courseName: evt.details.courseName,
        roomNumber: evt.details.roomNumber,
      }))
    )
    .returning({
      insertedId: course.id,
      calendarEventId: course.calendarEventId,
    })
    .onConflictDoUpdate({
      target: course.calendarEventId,
      set: {
        calendarEventName: sql.raw(`excluded."${course.calendarEventName.name}"`),
        calendarEventLastModified: sql.raw(`excluded."${course.calendarEventLastModified.name}"`),
        courseName: sql.raw(`excluded."${course.courseName.name}"`),
        roomNumber: sql.raw(`excluded."${course.roomNumber.name}"`),
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

    const courseSessionDurationSeconds = (evt.end.getTime() - evt.start.getTime()) / 1000
    const courseSessionDates = evt.rrule.all()
    await db.transaction(async (trx) => {
      const currentCourseSessionIds = await trx
        .insert(courseSession)
        .values(
          courseSessionDates.map((instance) => ({
            id: randomID(),
            courseId: course.insertedId,
            createdAt: new Date(),
            updatedAt: null,
            startTime: instance,
            endTime: add(instance, { seconds: courseSessionDurationSeconds }),
          }))
        )
        .onConflictDoUpdate({
          target: [courseSession.startTime, courseSession.endTime, courseSession.courseId],
          set: {
            updatedAt: new Date(),
          },
        })
        .returning({
          id: courseSession.id,
        })

      await trx.delete(courseSession).where(
        and(
          eq(courseSession.courseId, course.insertedId),
          inArray(
            courseSession.id,
            currentCourseSessionIds.map((row) => row.id)
          )
        )
      )
    })
  }
}

export const appRouter = router({
  courses: coursesRouter,
})

export type AppRouter = typeof appRouter

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
