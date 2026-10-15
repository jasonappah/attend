import { defineMutator, defineMutators } from '@rocicorp/zero'
import { z } from 'zod'
import { zql } from './schema.gen'

const attendanceSchema = z.enum(['present', 'absent']).nullable()

export const mutators = defineMutators({
  courseSession: {
    updateAttendance: defineMutator(
      z.object({
        id: z.string(),
        attendance: attendanceSchema.optional(),
      }),
      async ({ tx, ctx, args: { id, attendance } }) => {
        if (!ctx?.userId) {
          throw new Error('Not authenticated')
        }

        const existing = await tx.run(
          zql.courseSession
            .where('id', id)
            .whereExists('course', (q) => q.where('userId', ctx.userId))
            .one()
        )
        if (!existing) {
          throw new Error('Access denied')
        }

        await tx.mutate.courseSession.update({
          id,
          attendance: attendance ?? null,
        })
      }
    ),

    updateAttendanceBulk: defineMutator(
      z.object({
        sessions: z.array(
          z.object({
            id: z.string(),
            attendance: attendanceSchema,
          })
        ),
      }),
      async ({ tx, ctx, args: { sessions } }) => {
        if (!ctx?.userId) {
          throw new Error('Not authenticated')
        }

        for (const session of sessions) {
          const existing = await tx.run(
            zql.courseSession
              .where('id', session.id)
              .whereExists('course', (q) => q.where('userId', ctx.userId))
              .one()
          )
          if (!existing) {
            throw new Error('Access denied')
          }
          await tx.mutate.courseSession.update({
            id: session.id,
            attendance: session.attendance,
          })
        }
      }
    ),
  },
})
