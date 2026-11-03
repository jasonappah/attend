export type CalendarSession = {
  id: string
  startTime: number
  endTime: number
  attendance: 'present' | 'absent' | 'cancelled' | null
}

export type CalendarDay = {
  date: Date
  sessions: CalendarSession[]
  status: 'empty' | 'present' | 'absent' | 'cancelled' | 'mixed' | 'unrecorded' | 'upcoming'
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function attendanceCalendar(
  sessions: readonly CalendarSession[],
  now: number
): CalendarDay[][] {
  if (!sessions.length) return []
  const byDay = new Map<string, CalendarSession[]>()
  let first = Infinity
  let last = -Infinity
  for (const session of sessions) {
    const date = new Date(session.startTime)
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    first = Math.min(first, day)
    last = Math.max(last, day)
    const key = dayKey(date)
    const items = byDay.get(key) ?? []
    items.push(session)
    byDay.set(key, items)
  }
  const cursor = new Date(first)
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
  const weeks: CalendarDay[][] = []
  while (cursor.getTime() <= last) {
    const week: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor)
      const items = byDay.get(dayKey(date)) ?? []
      const states = new Set(
        items.map((item) => item.attendance ?? (item.endTime > now ? 'upcoming' : 'unrecorded'))
      )
      const status = states.size === 0 ? 'empty' : states.size > 1 ? 'mixed' : [...states][0]
      week.push({ date, sessions: items, status })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function attendancePercent(sessions: readonly CalendarSession[]) {
  // Cancelled classes don't count towards attendance at all.
  const marked = sessions.filter(
    (session) => session.attendance !== null && session.attendance !== 'cancelled'
  )
  return marked.length
    ? Math.round(
        (marked.filter((session) => session.attendance === 'present').length / marked.length) * 100
      )
    : null
}
