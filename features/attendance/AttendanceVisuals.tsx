import { useState } from 'react'
import { Paragraph, Progress, ScrollView, SizableText, XStack, YStack } from 'tamagui'
import {
  attendanceCalendar,
  attendancePercent,
  type CalendarDay,
  type CalendarSession,
} from './attendanceCalendar'

const colors = {
  empty: 'color-3',
  present: 'green-700',
  absent: 'red-700',
  cancelled: 'color-9',
  mixed: 'orange-700',
  unrecorded: 'color-8',
  upcoming: 'color-5',
} as const

const symbols = {
  present: '✓',
  absent: '×',
  cancelled: '∅',
  mixed: '•',
  unrecorded: '?',
  upcoming: '○',
} as const

export function AttendanceGauge({
  label,
  sessions,
}: {
  label: string
  sessions: readonly CalendarSession[]
}) {
  const value = attendancePercent(sessions)
  return (
    <YStack
      flex={1}
      minW={96}
      gap={6}
      accessibilityLabel={`${label}: ${value === null ? 'no recorded attendance' : `${value}% attendance`}`}
    >
      <SizableText size="xs" color="color-10">
        {label}
      </SizableText>
      <SizableText size="lg" fontWeight="700">
        {value === null ? '—' : `${value}%`}
      </SizableText>
      <Progress value={value ?? 0} size="xs" background="color-4" aria-hidden>
        <Progress.Indicator background="color-10" />
      </Progress>
    </YStack>
  )
}

function describeDay(day: CalendarDay, now: number) {
  const date = day.date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const details = day.sessions.map((session) => {
    const time = new Date(session.startTime).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${time}: ${session.attendance ?? (session.endTime > now ? 'upcoming' : 'not recorded')}`
  })
  return `${date} · ${details.join(' · ')}`
}

export function AttendanceCalendar({
  sessions,
  now,
}: {
  sessions: readonly CalendarSession[]
  now: number
}) {
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const weeks = attendanceCalendar(sessions, now)
  const selected = weeks
    .flat()
    .find((day) => day.date.getTime() === selectedDate && day.sessions.length > 0)
  if (!weeks.length) return <Paragraph color="color-10">No sessions to show yet.</Paragraph>

  return (
    <YStack gap={10}>
      <SizableText fontWeight="700">Attendance calendar</SizableText>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <XStack gap={4} pb={4}>
          {weeks.map((week) => (
            <YStack key={week[0].date.getTime()} gap={4}>
              {week.map((day) =>
                day.status === 'empty' ? (
                  <YStack
                    key={day.date.getTime()}
                    width={19}
                    height={19}
                    rounded={4}
                    background={colors.empty}
                    aria-hidden
                  />
                ) : (
                  <YStack
                    key={day.date.getTime()}
                    width={19}
                    height={19}
                    rounded={4}
                    background={colors[day.status]}
                    items="center"
                    justify="center"
                    onPress={() => setSelectedDate(day.date.getTime())}
                    role="button"
                    accessibilityLabel={describeDay(day, now)}
                  >
                    <SizableText
                      fontSize={12}
                      lineHeight={16}
                      fontWeight="700"
                      color={day.status === 'upcoming' ? 'color-10' : 'color-11'}
                    >
                      {symbols[day.status]}
                    </SizableText>
                  </YStack>
                )
              )}
            </YStack>
          ))}
        </XStack>
      </ScrollView>
      <XStack gap={12} flexWrap="wrap">
        {(['present', 'absent', 'cancelled', 'mixed', 'unrecorded', 'upcoming'] as const).map(
          (status) => (
            <XStack key={status} items="center" gap={4}>
              <YStack width={12} height={12} rounded={3} background={colors[status]} />
              <SizableText size="xs" color="color-10">
                {status === 'unrecorded'
                  ? 'Not recorded'
                  : status[0].toUpperCase() + status.slice(1)}
              </SizableText>
            </XStack>
          )
        )}
      </XStack>
      <SizableText size="xs" color="color-10">
        {selected ? describeDay(selected, now) : 'Select a class day for details.'}
      </SizableText>
    </YStack>
  )
}
