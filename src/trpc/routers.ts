import { eq } from 'drizzle-orm'
import { calendar } from '~/db/schema'
import { UTD_CONCEPT3D_MAP_ID, syncRoomsFromConcept3dMap } from './concept3d'
import { syncCoursesFromCalendar } from './ical'
import { authedProcedure, router } from './index'

const utilsRouter = router({
  addCoursesFromIcs: authedProcedure.mutation(async ({ ctx }) => {
    const calendarsFromDb = await ctx.db
      .select()
      .from(calendar)
      .where(eq(calendar.userId, ctx.session.user.id))

    if (calendarsFromDb.length === 0) {
      ctx.logger.error('no calendar in db for current user')
      return
    }

    await Promise.all(
      calendarsFromDb.map((cal) => syncCoursesFromCalendar(cal, ctx.db, ctx.logger))
    )

    return true
  }),
  syncRoomsFromConcept3dMap: authedProcedure.mutation(async ({ ctx }) => {
    await syncRoomsFromConcept3dMap(UTD_CONCEPT3D_MAP_ID, ctx.db, ctx.logger)
    return true
  }),
})

export const appRouter = router({
  utils: utilsRouter,
})

export type AppRouter = typeof appRouter
