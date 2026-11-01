import { initTRPC, TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { syncedDb } from '~/database/syncedDb'
import { calendar } from '~/database/schema'
import { syncCalendars, validateCalendarUrl } from './calendarSync'
import { syncRooms } from './roomSync'

const t = initTRPC.context<{ userId: string | null }>().create()
const authenticated = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { userId: ctx.userId } })
})

export const appRouter = t.router({
  addCalendar: authenticated.input(z.object({ url: z.url() })).mutation(async ({ ctx, input }) => {
    let url: URL
    try {
      url = validateCalendarUrl(input.url)
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Enter a Google Calendar iCal URL.' })
    }
    try {
      await syncedDb(ctx.userId).transaction(({ drizzle }) => drizzle.insert(calendar).values({ id: crypto.randomUUID(), userId: ctx.userId, upstreamUrl: url.href, createdAt: Date.now() }))
    } catch {
      throw new TRPCError({ code: 'CONFLICT', message: 'Unable to add this calendar. It may already be in use.' })
    }
  }),
  syncCalendars: authenticated.mutation(({ ctx }) => syncCalendars(ctx.userId)),
  syncRooms: authenticated.mutation(({ ctx }) => syncRooms(ctx.userId)),
  removeCalendar: authenticated.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const where = and(eq(calendar.id, input.id), eq(calendar.userId, ctx.userId))
    await syncedDb(ctx.userId).transaction(async ({ drizzle }) => {
      const existing = await drizzle.select({ id: calendar.id }).from(calendar).where(where)
      if (!existing.length) throw new TRPCError({ code: 'NOT_FOUND' })
      await drizzle.delete(calendar).where(where)
    })
  }),
})

export type AppRouter = typeof appRouter
