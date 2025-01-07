import { add } from "date-fns";
import { sql, and, eq, notInArray } from "drizzle-orm";
import type ical, { VEvent } from "node-ical";
import type { Logger } from "pino";
import type { Db } from "~/db";
import { room, course, courseSession } from "~/db/schema";
import { randomID } from "~/zero/randomID";

function getCourseDetailsFromIcsEvent(evt: VEvent) {
  const matches = evt.summary.match(/^(\w{2,4} \d{4} \d{3}) - (.*)$/);
  if (!matches) return null;
  return {
    courseName: matches[1],
    roomNumber: matches[2],
  };
}
type CourseDetails = NonNullable<
  ReturnType<typeof getCourseDetailsFromIcsEvent>
>;
export const syncCoursesFromCalendar = async (
  calendarFromDb: {
    id: string;
    upstreamUrl: string;
    userId: string;
  },
  db: Db,
  logger: Logger,
) => {
  const ics = await ical.async.fromURL(calendarFromDb.upstreamUrl);

  // TODO: maybe need to have a concept of semesters
  const classStartDate = new Date(2024, 7, 1);
  const classEndDate = new Date(2024, 11, 31);

  const dateInRange = (date: Date) =>
    date > classStartDate && date < classEndDate;

  type Out = [string, VEvent & { details: CourseDetails }][];
  const icsEventsForFall2024Courses = Object.fromEntries(
    (
      Object.entries(ics).filter(([, item]) => item.type === "VEVENT") as [
        string,
        VEvent,
      ][]
    )
      .filter(([, evt]) => dateInRange(evt.start))
      .reduce((acc, [key, evt]) => {
        const details = getCourseDetailsFromIcsEvent(evt);
        if (!details) return acc;

        return [...acc, [key, { ...evt, details }]] as Out;
      }, [] as Out),
  );

  if (Object.keys(icsEventsForFall2024Courses).length === 0) {
    logger.warn("No courses found in ics");
    return;
  }
  const rooms = await db.select().from(room);

  const insertedCourses = await db
    .insert(course)
    .values(
      Object.values(icsEventsForFall2024Courses).map((evt) => {
        const [buildingCode, roomNumber] = evt.details.roomNumber.split(" ");
        const room = rooms.find(
          (r) => r.buildingCode === buildingCode && r.roomNumber === roomNumber,
        );
        if (!room) {
          throw new Error(`No room found for ${evt.details.roomNumber}`);
        }
        return {
          id: randomID(),
          calendarEventName: evt.summary,
          userId: calendarFromDb.userId,
          calendarId: calendarFromDb.id,
          calendarEventId: evt.uid,
          calendarEventLastModified: evt.lastmodified,
          courseName: evt.details.courseName,
          roomId: room.id,
        };
      }),
    )
    .returning({
      insertedId: course.id,
      calendarEventId: course.calendarEventId,
    })
    .onConflictDoUpdate({
      target: course.calendarEventId,
      set: {
        calendarEventName: sql.raw(
          `excluded."${course.calendarEventName.name}"`,
        ),
        calendarEventLastModified: sql.raw(
          `excluded."${course.calendarEventLastModified.name}"`,
        ),
        courseName: sql.raw(`excluded."${course.courseName.name}"`),
        roomId: sql.raw(`excluded."${course.roomId.name}"`),
      },
    });

  for (const course of insertedCourses) {
    if (!course.calendarEventId) {
      logger.warn("Missing calendarEventId", course);
      continue;
    }
    const evt = icsEventsForFall2024Courses[course.calendarEventId];
    if (!evt.rrule) {
      logger.trace("Missing rrule", evt);
      continue;
    }

    const courseSessionDurationSeconds =
      (evt.end.getTime() - evt.start.getTime()) / 1000;
    const courseSessionDates = evt.rrule.all();
    await db.transaction(async (trx) => {
      const currentCourseSessionIds = await trx
        .insert(courseSession)
        .values(
          courseSessionDates.map((instance) => ({
            id: randomID(),
            courseId: course.insertedId,
            startTime: instance,
            endTime: add(instance, { seconds: courseSessionDurationSeconds }),
          })),
        )
        .onConflictDoUpdate({
          target: [
            courseSession.startTime,
            courseSession.endTime,
            courseSession.courseId,
          ],
          set: {
            courseId: course.insertedId,
          },
        })
        .returning({
          id: courseSession.id,
        });

      await trx.delete(courseSession).where(
        and(
          eq(courseSession.courseId, course.insertedId),
          notInArray(
            courseSession.id,
            currentCourseSessionIds.map((row) => row.id),
          ),
        ),
      );
    });
  }
};
