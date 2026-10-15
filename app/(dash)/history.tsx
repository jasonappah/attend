import { useQuery, useZero } from '@rocicorp/zero/react'
import { Fragment } from 'react/jsx-runtime'
import { Button, H2 } from 'tamagui'
import { AttendanceHistory } from '~/interface/attendance-history/attendance-history'
import { mutators } from '~/zero/mutators'
import { queries } from '~/zero/queries'

export default function AttendanceHistoryPage() {
  const zero = useZero()
  const [courses] = useQuery(queries.courses())
  const [sessions] = useQuery(queries.sessions())

  return (
    <Fragment>
      <H2>Attendance History</H2>
      <Button
        onPress={async () => {
          const randomized = sessions.map((session) => {
            const rand = Math.random()
            return {
              id: session.id,
              attendance: (rand > 2 / 3 ? 'present' : rand > 1 / 3 ? 'absent' : null) as
                | 'present'
                | 'absent'
                | null,
            }
          })
          await zero.mutate(mutators.courseSession.updateAttendanceBulk({ sessions: randomized }))
        }}
      >
        Randomize Attendance
      </Button>
      <AttendanceHistory courses={courses} sessions={sessions} />
    </Fragment>
  )
}
