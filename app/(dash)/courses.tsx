import { useQuery } from '@rocicorp/zero/react'
import { addWeeks, format, isWithinInterval, startOfMonth, startOfWeek } from 'date-fns'
import { useState } from 'react'
import { Button, Card, H2, H3, Paragraph, ScrollView, Text, XStack, YStack } from 'tamagui'
import { queries } from '~/zero/queries'
import type { Course, CourseSession, Room } from '~/zero/schema.gen'

export default function ClassOverviewPage() {
  const [courses, coursesQuery] = useQuery(queries.coursesWithRooms())

  return (
    <ScrollView flex={1} minH={0} width="100%">
      <YStack gap="4" pb="4">
        <H2>Courses</H2>
        {coursesQuery.type === 'error' && <Paragraph>Failed to load courses.</Paragraph>}
        {courses.map((course) => (
          <CourseCard key={course.id} data={course} />
        ))}
      </YStack>
    </ScrollView>
  )
}

function attendanceRate(sessions: readonly CourseSession[]) {
  const recorded = sessions.filter((session) => session.attendance != null)
  if (recorded.length === 0) return null
  return Math.round(
    (recorded.filter((session) => session.attendance === 'present').length / recorded.length) * 100
  )
}

function CourseCard({ data }: { data: Course & { room?: Room | null } }) {
  const [sessions, sessionsQuery] = useQuery(queries.sessionsForCourse({ courseId: data.id }))
  const loading = sessionsQuery.type !== 'complete'
  const [lastWeek, setLastWeek] = useState(false)
  const now = new Date()
  const weekStart = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), lastWeek ? -1 : 0)
  const weekEnd = addWeeks(weekStart, 1)
  const weekSessions = sessions.filter(
    (session) => session.startTime >= weekStart.getTime() && session.startTime < weekEnd.getTime()
  )
  const completed = sessions.filter((session) => session.endTime <= now.getTime())
  const monthSessions = completed.filter((session) =>
    isWithinInterval(session.startTime, { start: startOfMonth(now), end: now })
  )
  const recordedWeek = weekSessions.filter((session) => session.endTime <= now.getTime())
  const courseRate = attendanceRate(completed)
  const metrics = [
    { label: lastWeek ? 'Last week' : 'This week', value: attendanceRate(recordedWeek) },
    { label: 'This month', value: attendanceRate(monthSessions) },
    { label: 'Overall', value: courseRate },
  ]

  return (
    <Card borderWidth={1} borderColor="borderColor" p="5" gap="5">
      <YStack gap="1">
        <H3>{data.courseName}</H3>
        <Text color="color10">
          {data.room ? `${data.room.buildingCode} ${data.room.roomNumber}` : 'Room unavailable'}
        </Text>
      </YStack>

      <XStack flexWrap="wrap" gap="4">
        {metrics.map((metric) => (
          <YStack key={metric.label} flex={1} minW={100} gap="2">
            <Text color="color10" fontSize="2">
              {metric.label}
            </Text>
            <Text fontSize="7" fontWeight="700">
              {loading || metric.value === null ? '—' : `${metric.value}%`}
            </Text>
            <YStack height={5} background="color4" rounded="10" overflow="hidden">
              {metric.value !== null && !loading && (
                <YStack height={5} width={`${metric.value}%`} background="color10" rounded="10" />
              )}
            </YStack>
          </YStack>
        ))}
      </XStack>
      <YStack gap="3">
        <XStack justify="space-between" items="center" flexWrap="wrap" gap="2">
          <YStack>
            <Text fontWeight="700">Class sessions</Text>
            <Text fontSize="2" color="color10">
              {format(weekStart, 'MMM d')} – {format(new Date(weekEnd.getTime() - 1), 'MMM d')}
            </Text>
          </YStack>
          <XStack gap="2">
            <Button
              opacity={lastWeek ? 0.6 : 1}
              onPress={() => setLastWeek(false)}
              accessibilityState={{ selected: !lastWeek }}
            >
              This week
            </Button>
            <Button
              opacity={lastWeek ? 1 : 0.6}
              onPress={() => setLastWeek(true)}
              accessibilityState={{ selected: lastWeek }}
            >
              Last week
            </Button>
          </XStack>
        </XStack>
        {sessionsQuery.type === 'error' ? (
          <Text color="color10">Failed to load attendance.</Text>
        ) : loading ? (
          <Text color="color10">Loading sessions…</Text>
        ) : weekSessions.length === 0 ? (
          <Text color="color10">No sessions scheduled this week.</Text>
        ) : (
          <ScrollView horizontal>
            <XStack gap="2">
              {weekSessions.map((session) => {
                const status =
                  session.attendance === 'present'
                    ? 'Present'
                    : session.attendance === 'absent'
                      ? 'Absent'
                      : session.endTime > now.getTime()
                        ? 'Upcoming'
                        : 'Not recorded'
                return (
                  <YStack
                    key={session.id}
                    p="3"
                    minW={115}
                    borderWidth={1}
                    borderColor="borderColor"
                    rounded="4"
                    gap="1"
                    accessibilityLabel={`${format(session.startTime, 'EEEE, MMMM d, h:mm a')}: ${status}`}
                  >
                    <Text fontWeight="700">{format(session.startTime, 'EEE, MMM d')}</Text>
                    <Text fontSize="2" color="color10">
                      {format(session.startTime, 'h:mm a')}
                    </Text>
                    <Text
                      fontSize="2"
                      fontWeight="600"
                      color={
                        session.attendance === 'present'
                          ? 'green10'
                          : session.attendance === 'absent'
                            ? 'red10'
                            : 'color10'
                      }
                    >
                      {status}
                    </Text>
                  </YStack>
                )
              })}
            </XStack>
          </ScrollView>
        )}
      </YStack>
    </Card>
  )
}
