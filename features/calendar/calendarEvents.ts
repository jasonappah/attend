import type { VEvent } from 'node-ical'

// Attend's fall term runs August through January; spring runs February
// through July. Keep old calendar history out of the current import.
export function currentAcademicTerm(now: number): { start: number; end: number } {
  const date = new Date(now)
  const year = date.getFullYear()
  const month = date.getMonth()
  if (month >= 7)
    return { start: new Date(year, 7, 1).getTime(), end: new Date(year + 1, 1, 1).getTime() }
  if (month === 0)
    return { start: new Date(year - 1, 7, 1).getTime(), end: new Date(year, 1, 1).getTime() }
  return { start: new Date(year, 1, 1).getTime(), end: new Date(year, 7, 1).getTime() }
}

export function sessionTimes(event: VEvent): { startTime: number; endTime: number }[] {
  const start = event.start.getTime()
  const duration = (event.end?.getTime() ?? Number.NaN) - start
  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0)
    throw new Error('Invalid event times.')
  const until = new Date(start)
  until.setFullYear(until.getFullYear() + 2)
  const occurrences = event.rrule
    ? event.rrule.all((date, index) => index <= 1000 && date <= until)
    : [event.start]
  if (occurrences.length > 1000) throw new Error('Too many event occurrences.')
  return occurrences.flatMap((date) => {
    const iso = date.toISOString()
    const day = iso.slice(0, 10)
    const override = event.recurrences?.[iso] ?? event.recurrences?.[day]
    if (override?.status === 'CANCELLED') return []
    if (!override && (event.exdate?.[iso] || event.exdate?.[day])) return []
    const from = override?.start instanceof Date ? override.start.getTime() : date.getTime()
    const to = override?.end instanceof Date ? override.end.getTime() : from + duration
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from)
      throw new Error('Invalid recurrence times.')
    return [{ startTime: from, endTime: to }]
  })
}
