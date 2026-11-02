import { mutations, type zql } from 'on-zero'
import { courseSessionPermission } from './queries'

export const mutate = mutations(
  'courseSession',
  courseSessionPermission,
  {
    updateAttendance: async (
      ctx,
      args: { id: string; attendance: 'present' | 'absent' | null }
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
      await ctx.tx.mutate.courseSession.update(args)
    },
    importAttendance: async (ctx, args: { id: string; attendance: 'present' | 'absent' }) => {
      if (ctx.environment === 'server') {
        const query = ctx.tx.query as unknown as typeof zql
        const userId = ctx.authData?.id
        if (!userId) throw new Error('Not authenticated')
        const existing = await ctx.tx.run(
          query.courseSession
            .where('id', args.id)
            .whereExists('course', (course) => course.where('userId', userId))
            .one()
        )
        if (!existing) throw new Error('Access denied')
        if (existing.attendance !== null) return
      }
      await ctx.tx.mutate.courseSession.update(args)
    },
  },
  { crud: false }
)
