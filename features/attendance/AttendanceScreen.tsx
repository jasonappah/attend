import { useState } from 'react'
import { H2, Paragraph, SizableText, XStack, YStack, isWeb } from 'tamagui'
import { courses } from '~/data/course/queries'
import { sessions } from '~/data/courseSession/queries'
import { useMutation, useQuery, zero } from '~/data/zero-client'
import { AccountToolbarButton } from '~/features/account/AccountToolbarButton'
import { Button } from '~/interface/buttons/Button'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import { CalendarSettings } from './CalendarSettings'
import { TimelineImport } from './TimelineImport'

export function AttendanceScreen({ mode }: { mode: 'today' | 'history' | 'courses' }) {
  const [allCourses, courseQuery] = useQuery(courses)
  const [allSessions, sessionQuery] = useQuery(sessions)
  const [previousWeek, setPreviousWeek] = useState(false)
  const [mark, mutation] = useMutation((args: Parameters<typeof zero.mutate.courseSession.updateAttendance>[0]) =>
    zero.mutate.courseSession.updateAttendance(args),
  )
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - (previousWeek ? 7 : 0)).getTime()
  const nextWeek = new Date(new Date(week).getFullYear(), new Date(week).getMonth(), new Date(week).getDate() + 7).getTime()
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const rate = (items: typeof allSessions) => {
    const marked = items.filter((item) => item.attendance !== null)
    return marked.length ? `${Math.round(marked.filter((item) => item.attendance === 'present').length / marked.length * 100)}%` : '—'
  }
  const visible = mode === 'today'
    ? allSessions.filter((session) => session.startTime >= start && session.startTime < end)
    : [...allSessions].reverse()

  return (
    <>
      <AccountToolbarButton />
      <PageScrollView startUnderBar contentPaddingTop={24} contentPaddingBottom={36}>
        <YStack width="100%" maxW={640} self="center" px={16} gap={18}>
          {isWeb ? <H2>{mode === 'today' ? 'Today' : mode === 'history' ? 'History' : 'Courses'}</H2> : null}
          {mutation.error ? <Paragraph color="red-900">Could not save attendance. Please try again.</Paragraph> : null}
          {courseQuery.type === 'error' || sessionQuery.type === 'error' ? <Paragraph>Could not load classes.</Paragraph>
          : courseQuery.type !== 'complete' || sessionQuery.type !== 'complete' ? <Paragraph>Loading classes…</Paragraph>
          : mode === 'courses' ? (
            allCourses.length ? allCourses.map((course) => {
              const courseSessions = allSessions.filter((item) => item.courseId === course.id)
              const completed = courseSessions.filter((item) => item.endTime <= now.getTime())
              const weekSessions = courseSessions.filter((item) => item.startTime >= week && item.startTime < nextWeek)
              return <YStack key={course.id} gap={8} py={12} borderBottomWidth={1} borderColor="color-5">
                <SizableText fontWeight="700">{course.courseName}</SizableText>
                <Paragraph color="color-10">{course.room ? `${course.room.buildingCode} ${course.room.roomNumber}` : 'No room'}</Paragraph>
                <XStack gap={16} flexWrap="wrap">
                  <Paragraph>{previousWeek ? 'Last week' : 'This week'}: {rate(weekSessions.filter((item) => item.endTime <= now.getTime()))}</Paragraph>
                  <Paragraph>This month: {rate(completed.filter((item) => item.startTime >= month))}</Paragraph>
                  <Paragraph>Overall: {rate(completed)}</Paragraph>
                </XStack>
                <XStack gap={8}>
                  <Button size="sm" subtle={previousWeek} onPress={() => setPreviousWeek(false)}>This week</Button>
                  <Button size="sm" subtle={!previousWeek} onPress={() => setPreviousWeek(true)}>Last week</Button>
                </XStack>
                {weekSessions.length ? weekSessions.map((item) => <Paragraph key={item.id} color="color-10">
                  {new Date(item.startTime).toLocaleString()} · {item.attendance ?? (item.endTime > now.getTime() ? 'Upcoming' : 'Not recorded')}
                </Paragraph>) : <Paragraph color="color-10">No sessions scheduled this week.</Paragraph>}
              </YStack>
            }) : <Paragraph>No courses yet. Add a calendar below.</Paragraph>
          ) : visible.length ? visible.map((session) => (
            <YStack key={session.id} gap={8} py={12} borderBottomWidth={1} borderColor="color-5">
              <SizableText fontWeight="700">{session.course?.courseName ?? 'Course'}</SizableText>
              <Paragraph color="color-10">
                {new Date(session.startTime).toLocaleString()} – {new Date(session.endTime).toLocaleTimeString()}
                {session.course?.room ? ` · ${session.course.room.buildingCode} ${session.course.room.roomNumber}` : ''}
              </Paragraph>
              <Paragraph>Attendance: {session.attendance ?? 'Not marked'}</Paragraph>
              <XStack gap={8} flexWrap="wrap">
                <Button size="sm" onPress={() => void mark({ id: session.id, attendance: 'present' })}>Present</Button>
                <Button size="sm" onPress={() => void mark({ id: session.id, attendance: 'absent' })}>Absent</Button>
                <Button size="sm" subtle onPress={() => void mark({ id: session.id, attendance: null })}>Clear</Button>
              </XStack>
            </YStack>
          )) : <Paragraph>{mode === 'today' ? 'No classes today.' : 'No sessions yet.'}</Paragraph>}
          {mode === 'courses' ? <CalendarSettings /> : null}
          {mode === 'history' ? <TimelineImport /> : null}
        </YStack>
      </PageScrollView>
    </>
  )
}
