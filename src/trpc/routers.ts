import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { add } from "date-fns";
import { and, eq, notInArray, sql } from "drizzle-orm";
import ical, { type VEvent } from "node-ical";
import type { Db } from "~/db";
import {
  calendar,
  Concept3DShapeSchema,
  course,
  courseSession,
  room,
  type Concept3DShape,
} from "~/db/schema";
import { type Logger } from "pino";
import { randomID } from "~/zero/randomID";
import { authedProcedure, router } from "./index";

const coursesRouter = router({
  addCoursesFromIcs: authedProcedure.mutation(async ({ ctx }) => {
    // TODO: also consider doing this client side / as a background task

    const calendarsFromDb = await ctx.db
      .select()
      .from(calendar)
      .where(eq(calendar.userId, ctx.session.user.id));

    if (calendarsFromDb.length === 0) {
      ctx.logger.error("no calendar in db for current user");
      return;
    }

    await Promise.all(
      calendarsFromDb.map((cal) =>
        syncCoursesFromCalendar(cal, ctx.db, ctx.logger),
      ),
    );

    return true;
  }),
  syncRoomsFromConcept3dMap: authedProcedure.mutation(async ({ ctx }) => {
    await syncRoomsFromConcept3dMap(UTD_CONCEPT3D_MAP_ID, ctx.db, ctx.logger);
    return true;
  }),
});

function getCourseDetailsFromIcsEvent(evt: VEvent) {
  const matches = evt.summary.match(/^(\w{2,4} \d{4} \d{3}) - (.*)$/);
  if (!matches) return null;
  return {
    courseName: matches[1],
    roomNumber: matches[2],
  };
}

// https://api.concept3d.com/categories/<concept3dCategoryId>?map=<mapId>&children&key=<from browser>
// endpoint returns data for a given concept3dCategoryId (seems to be a building ID?)
// mapId for UTD: 1772
// notable keys: name, lat, lng, children
// children: adds an array of "children locations" to the response.
// notable keys in each "child location":
// - paths: list of points [lat: number, lng: number] that construct a polygon defining a room's outline
// - mrkId: an integer identifying a room
// - name: name of the room (ex: ECSW 1.315)
// - lat and lng: the latitude and longitude of the room, presumably at a central point in the room? idk

export type Concept3DLocation = {
  catId: number;
  altitude: number;
  lat: number;
  lng: number;
  mapId: number;
  id: number;
  icon: string;
  level: Array<number>;
  location_open: string;
  mrkId: number;
  name: string;
  reference: string;
  shape: Concept3DShape;
};

export type Concept3DCategoryWithChildren = {
  name: string;
  hidden: number;
  type: string;
  weight: number;
  private: number;
  lat: number;
  lng: number;
  level: number;
  schedule: any;
  floor_level: number;
  labels: string;
  locationDisplay: string;
  onByDefault: number;
  catId: number;
  mapId: number;
  parent: number;
  markerAlt: number;
  mapAlt: number;
  children: {
    locations: Array<Concept3DLocation>;
  };
};

const getBatchCategories = async (
  categoryIds: number[],
  mapId: number,
): Promise<Concept3DCategoryWithChildren[]> => {
  const categories = await fetch(
    `https://api.concept3d.com/categories/${categoryIds.join(
      ",",
    )}?map=${mapId}&batch&children&key=${process.env.CONCEPT3D_API_KEY}`,
  ).then((res) => res.json() as Promise<Concept3DCategoryWithChildren[]>);
  return categories;
};

const parseLocationData = (location: Concept3DLocation, logger: Logger) => {
  const roomCodeRegex = /([\w\d]{2,})\s*(\d+\.[\w\d]+)/;
  const match = location.name.trim().match(roomCodeRegex);
  if (!match) {
    logger.warn(`Failed to parse room name: ${location.name}`);
    return;
  }

  const [, buildingCode, roomNumber] = match;

  const [level] = location.level;

  const parsedShape = Concept3DShapeSchema.safeParse(location.shape);

  if (!parsedShape.success) {
    logger.warn(
      `Failed to parse shape for ${location.name}, error: ${parsedShape.error}, shape: ${location.shape}`,
    );
    return;
  }
  const shape = parsedShape.data;

  return {
    buildingCode,
    roomNumber,
    latitude: location.lat,
    longitude: location.lng,
    level,
    concept3dMapId: location.mapId,
    concept3dShape: shape,
    concept3dCategoryId: location.catId,
    concept3dMarkId: location.mrkId,
    concept3dLocationId: location.id,
  };
};

const UTD_CONCEPT3D_MAP_ID = 1772;

const syncRoomsFromConcept3dMap = async (
  mapId: number,
  db: Db,
  logger: Logger,
) => {
  const categoryIds = Object.values(
    await fetch(
      `https://api.concept3d.com/categories?childIds&map=${mapId}&children&noPrivates&key=${process.env.CONCEPT3D_API_KEY}`,
    ).then((res) => res.json() as Promise<Record<string, number[]>>),
  ).flat();
  const dedupedCategoryIds = Array.from(new Set(categoryIds));

  const categories = await getBatchCategories(dedupedCategoryIds, mapId);

  const buildingRegex = /^[\w\d\s]* \(([\w\d]*)\)$/;
  const disallowedBuildingAbbrvs = ["AED", "AST", "ATM", "OSV"];
  const buildingCategories = categories
    .map((c) => ({ category: c, match: c.name.match(buildingRegex) }))
    .filter(
      ({ match }) => match && !disallowedBuildingAbbrvs.includes(match[1]),
    );

  for (const { category } of buildingCategories) {
    const rooms = category.children.locations
      .map((r) => parseLocationData(r, logger))
      .filter((r) => !!r);

    await db
      .insert(room)
      .values(
        rooms.map((r) => ({
          ...r,
          id: randomID(),
          concept3dCategoryName: category.name,
        })),
      )
      .onConflictDoNothing();
  }
};

type CourseDetails = NonNullable<
  ReturnType<typeof getCourseDetailsFromIcsEvent>
>;

const syncCoursesFromCalendar = async (
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

export const appRouter = router({
  courses: coursesRouter,
});

export type AppRouter = typeof appRouter;

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
