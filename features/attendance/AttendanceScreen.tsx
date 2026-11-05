import { useState } from 'react'
import { H2, isWeb, Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { courses } from '~/data/course/queries'
import { sessions } from '~/data/courseSession/queries'
import { useMutation, useQuery, zero } from '~/data/zero-client'
import { AccountToolbarButton } from '~/features/account/AccountToolbarButton'
import { Button } from '~/interface/buttons/Button'
import { EmptyState } from '~/interface/layout/EmptyState'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import { AttendanceCalendar, AttendanceGauge } from './AttendanceVisuals'
import { TimelineImport } from './TimelineImport'

type QueryMapProps<T extends readonly unknown[]> = {
  data: T
  queryState: { type: 'complete' | 'error' | 'unknown' }
  renderContent: (data: T) => React.ReactNode
  loadingElement?: React.ReactNode
  errorElement?: React.ReactNode
  emptyElement?: React.ReactNode
  renderPartialResults?: boolean
}

function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`)
}

function QueryMap<T extends readonly unknown[]>({
  /**
   * The query results data array. Can be empty during 'unknown' state.
   */
  data,
  /**
   * The query execution state with .type being 'complete', 'error', or 'unknown'.
   */
  queryState,
  /**
   * Function that renders the data array.
   * Should return JSX for the mapped content.
   */
  renderContent,
  /**
   * Optional custom loading element shown during 'unknown' state with no data.
   * Defaults to <Paragraph>Loading…</Paragraph>.
   */
  loadingElement = <Paragraph>Loading…</Paragraph>,
  /**
   * Optional custom error element shown when queryState.type === 'error'.
   * Defaults to <Paragraph>Could not load data.</Paragraph>.
   */
  errorElement = <Paragraph>Could not load data.</Paragraph>,
  /**
   * Optional custom empty state element shown when queryState.type === 'complete' but data is empty.
   * **Suggestion**: Consider using the EmptyState component from `~/interface/layout/EmptyState`
   * (takes `{ icon, title, description?, ctaLabel?, onCtaPress? }`, where `ctaLabel` and
   * `onCtaPress` go together) instead of a bare `<Paragraph>`.
   * Defaults to <Paragraph>No data yet.</Paragraph>.
   */
  emptyElement = <Paragraph>No data yet.</Paragraph>,
  /**
   * When true (the default), data that already arrived while the query is still
   * streaming (`queryState.type === 'unknown'`) is rendered immediately instead of
   * being held behind the loading element. Set false to wait for 'complete'.
   */
  renderPartialResults = true,
}: QueryMapProps<T>) {
  switch (queryState.type) {
    case 'error':
      return errorElement
    case 'complete':
      if (data.length === 0) {
        return emptyElement
      }
      return renderContent(data)
    case 'unknown':
      if (renderPartialResults) {
        if (data.length === 0) {
          return loadingElement
        }
        return renderContent(data)
      }
      // renderPartialResults false: treat as complete (map data)
      return renderContent(data)
    default:
      assertNever(queryState.type)
  }
}

export function AttendanceScreen({ mode }: { mode: 'today' | 'history' | 'courses' }) {
  const courseQuery = useQuery(courses)
  const sessionQuery = useQuery(sessions)
  const [previousWeek, setPreviousWeek] = useState(false)
  const [mark, mutation] = useMutation(
    (args: Parameters<typeof zero.mutate.courseSession.updateAttendance>[0]) =>
      zero.mutate.courseSession.updateAttendance(args)
  )
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const week = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - ((now.getDay() + 6) % 7) - (previousWeek ? 7 : 0)
  ).getTime()
  const nextWeek = new Date(
    new Date(week).getFullYear(),
    new Date(week).getMonth(),
    new Date(week).getDate() + 7
  ).getTime()
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  // QueryMap handles the loading/error/empty lifecycle for each query. The
  // renderContent callback still does the per-item mapping and derived data —
  // that's exactly why it receives the full array rather than individual items.
  const isCoursesMode = mode === 'courses'

  return (
    <>
      <AccountToolbarButton />
      <PageScrollView startUnderBar contentPaddingTop={24} contentPaddingBottom={36}>
        <YStack width="100%" maxW={640} self="center" px={16} gap={18}>
          {isWeb ? (
            <H2>{mode === 'today' ? 'Today' : mode === 'history' ? 'History' : 'Courses'}</H2>
          ) : null}
          {mutation.error ? (
            <Paragraph color="red-900">Could not save attendance. Please try again.</Paragraph>
          ) : null}
          <QueryMap
            data={courseQuery[0]}
            queryState={courseQuery[1]}
            renderContent={(courseData) =>
              courseData.map((course) => {
                const courseSessions = sessionQuery[1].type === 'complete' ? sessionQuery[0] : []
                const sessionsForCourse = courseSessions.filter(
                  (item) => item.courseId === course.id
                )
                const completed = sessionsForCourse.filter((item) => item.endTime <= now.getTime())
                const weekSessions = sessionsForCourse.filter(
                  (item) => item.startTime >= week && item.startTime < nextWeek
                )
                return (
                  <YStack
                    key={course.id}
                    gap={8}
                    py={12}
                    borderBottomWidth={1}
                    borderColor="color-5"
                  >
                    <SizableText fontWeight="700">{course.courseName}</SizableText>
                    <Paragraph color="color-10">
                      {course.room
                        ? `${course.room.buildingCode} ${course.room.roomNumber}`
                        : 'No room'}
                    </Paragraph>
                    <XStack gap={16} flexWrap="wrap">
                      <AttendanceGauge
                        label={previousWeek ? 'Last week' : 'This week'}
                        sessions={weekSessions.filter((item) => item.endTime <= now.getTime())}
                      />
                      <AttendanceGauge
                        label="This month"
                        sessions={completed.filter((item) => item.startTime >= month)}
                      />
                      <AttendanceGauge label="Overall" sessions={completed} />
                    </XStack>
                    <XStack gap={8}>
                      <Button
                        size="sm"
                        subtle={previousWeek}
                        onPress={() => setPreviousWeek(false)}
                      >
                        This week
                      </Button>
                      <Button
                        size="sm"
                        subtle={!previousWeek}
                        onPress={() => setPreviousWeek(true)}
                      >
                        Last week
                      </Button>
                    </XStack>
                    {weekSessions.length ? (
                      weekSessions.map((item) => (
                        <Paragraph key={item.id} color="color-10">
                          {new Date(item.startTime).toLocaleString()} ·{' '}
                          {item.attendance ??
                            (item.endTime > now.getTime() ? 'Upcoming' : 'Not recorded')}
                        </Paragraph>
                      ))
                    ) : (
                      <Paragraph color="color-10">No sessions scheduled this week.</Paragraph>
                    )}
                    <AttendanceCalendar sessions={sessionsForCourse} now={now.getTime()} />
                  </YStack>
                )
              })
            }
          />
          {isCoursesMode && (
            <EmptyState
              icon={<AttendanceCalendar sessions={[]} now={now.getTime()} />}
              title="No courses yet"
              description="Add a calendar to get started."
            />
          )}
          <QueryMap
            data={sessionQuery[0]}
            queryState={sessionQuery[1]}
            emptyElement={
              <EmptyState
                icon={<AttendanceCalendar sessions={[]} now={now.getTime()} />}
                title="No sessions yet"
                description="Add sessions to view here."
              />
            }
            renderContent={(sessionData) =>
              sessionData.length ? (
                sessionData
                  .filter((session) => {
                    if (mode === 'today') {
                      return session.startTime >= start && session.startTime < end
                    }
                    if (mode === 'history') {
                      return session.startTime < end
                    }
                    return true // mode === 'courses' — show all sessions
                  })
                  .map((session) => (
                    <YStack
                      key={session.id}
                      gap={8}
                      py={12}
                      borderBottomWidth={1}
                      borderColor="color-5"
                    >
                      <SizableText fontWeight="700">
                        {session.course?.courseName ?? 'Course'}
                      </SizableText>
                      <Paragraph color="color-10">
                        {new Date(session.startTime).toLocaleString()} –{' '}
                        {new Date(session.endTime).toLocaleTimeString()}
                        {session.course?.room
                          ? ` · ${session.course.room.buildingCode} ${session.course.room.roomNumber}`
                          : ''}
                      </Paragraph>
                      <Paragraph>Attendance: {session.attendance ?? 'Not marked'}</Paragraph>
                      <XStack gap={8} flexWrap="wrap">
                        <Button
                          size="sm"
                          onPress={() => void mark({ id: session.id, attendance: 'present' })}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          onPress={() => void mark({ id: session.id, attendance: 'absent' })}
                        >
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          subtle
                          onPress={() => void mark({ id: session.id, attendance: null })}
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onPress={() => void mark({ id: session.id, attendance: 'cancelled' })}
                        >
                          Cancelled
                        </Button>
                      </XStack>
                    </YStack>
                  ))
              ) : (
                <EmptyState
                  icon={<AttendanceCalendar sessions={[]} now={now.getTime()} />}
                  title="No sessions yet"
                  description="Add sessions to view here."
                />
              )
            }
          />
          {mode === 'history' ? <TimelineImport /> : null}
        </YStack>
      </PageScrollView>
    </>
  )
}
