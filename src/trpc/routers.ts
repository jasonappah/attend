import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { calendar } from '~/db/schema'
import { randomID } from '~/zero/randomID'
import { UTD_CONCEPT3D_MAP_ID, syncRoomsFromConcept3dMap } from './concept3d'
import { syncCoursesFromCalendar } from './ical'
import { authedProcedure, router } from './index'

const utilsRouter = router({
  addCalendar: authedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const url = new URL(input.url)
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'calendar.google.com' ||
        !url.pathname.startsWith('/calendar/ical/') ||
        url.username ||
        url.password ||
        url.port
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enter a Google Calendar iCal URL.' })
      }
      try {
        await ctx.db
          .insert(calendar)
          .values({ id: randomID(), upstreamUrl: url.href, userId: ctx.session.user.id })
      } catch {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Unable to add this calendar. It may already be in use.',
        })
      }
    }),
  removeCalendar: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const owned = and(eq(calendar.id, input.id), eq(calendar.userId, ctx.session.user.id))
      const [existing] = await ctx.db.select({ id: calendar.id }).from(calendar).where(owned)
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.delete(calendar).where(owned)
    }),
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
