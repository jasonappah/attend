/**
 * @agent-rule
 * mutation params must be inline, flat object types. for example:
 * `insert(ctx, props: { id: string; userId: string; createdAt: number })`.
 * never a type reference, imported alias, or drizzle-inferred type
 * (`typeof x.$inferInsert`): the codegen is a string parser and silently
 * degrades any param it can't read to `v.record(v.unknown())`, dropping all
 * validation. keep props flat and primitive-typed.
 */
import { mutations, type zql } from 'on-zero'
import { courseSessionPermission } from './queries'

// one timeline import applies many estimates in a single mutation; bound the
// payload so a huge JSON export cannot make the transaction unbounded work.
const IMPORT_ATTENDANCE_LIMIT = 500

export const mutate = mutations(
  'courseSession',
  courseSessionPermission,
  {
    updateAttendance: async (
      ctx,
      args: {
        id: string
        attendance: 'present' | 'absent' | 'cancelled' | null
      }
    ) => {
      if (ctx.environment === 'server') {
        if (!ctx.authData?.id) throw new Error('Not authenticated')
        // Build the permission query with this transaction's own Zero instance.
        // Vite can load the app's global builder and the sync executor from
        // different modules, whose private query symbols are not interchangeable.
        const query = ctx.tx.query as unknown as typeof zql
        const existing = await ctx.tx.run(
          query.courseSession
            .where('id', args.id)
            .whereExists('course', (course) => course.where('userId', ctx.authData!.id))
            .one()
        )
        if (!existing) throw new Error('Access denied')
      }
      await ctx.tx.mutate.courseSession.update({
        id: args.id,
        attendance: args.attendance,
        attendanceSource: args.attendance === null ? null : 'manual',
      })
    },
    importAttendance: async (
      ctx,
      args: { items: { id: string; attendance: 'present' | 'absent' }[] }
    ) => {
      if (args.items.length === 0) return
      if (args.items.length > IMPORT_ATTENDANCE_LIMIT) {
        throw new Error('Too many attendance estimates')
      }

      if (ctx.environment === 'server') {
        const query = ctx.tx.query as unknown as typeof zql
        const userId = ctx.authData?.id
        if (!userId) throw new Error('Not authenticated')
        const existing = await ctx.tx.run(
          query.courseSession
            .where(
              'id',
              'IN',
              args.items.map((item) => item.id)
            )
            .whereExists('course', (course) => course.where('userId', userId))
        )
        const byId = new Map(existing.map((row) => [row.id, row]))
        for (const item of args.items) {
          const row = byId.get(item.id)
          if (!row) throw new Error('Access denied')
          if (row.attendance !== null) continue
          await ctx.tx.mutate.courseSession.update({
            id: item.id,
            attendance: item.attendance,
            attendanceSource: 'timeline',
          })
        }
        return
      }

      for (const item of args.items) {
        await ctx.tx.mutate.courseSession.update({
          id: item.id,
          attendance: item.attendance,
          attendanceSource: 'timeline',
        })
      }
    },
  },
  { crud: false }
)
