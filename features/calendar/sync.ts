import { eq } from 'drizzle-orm'
import type { VEvent } from 'node-ical'
import ical from 'node-ical'
import { calendar, course, courseSession, room } from '~/database/schema'
import { syncedDb } from '~/database/syncedDb'
import { currentAcademicTerm, sessionTimes } from './calendarEvents'

// Never follow a calendar redirect: calendar URLs can contain private tokens,
// and forwarding them to a redirect target would also permit SSRF.
export function validateCalendarUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'calendar.google.com' ||
    !url.pathname.startsWith('/calendar/ical/') ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error('Enter a Google Calendar iCal URL.')
  }
  return url
}

async function readCalendar(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Calendar response has no body.')
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 10_000_000) throw new Error('Calendar is too large.')
      chunks.push(decoder.decode(value, { stream: true }))
    }
    chunks.push(decoder.decode())
    return chunks.join('')
  } finally {
    await reader.cancel().catch(() => {})
  }
}

export async function syncCalendars(
  userId: string,
  fetchCalendar: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
  now = Date.now()
) {
  const db = syncedDb(userId)
  const calendars = await db.transaction(({ drizzle }) =>
    drizzle.select().from(calendar).where(eq(calendar.userId, userId))
  )
  if (!calendars.length) throw new Error('Add a calendar first.')
  let imported = 0
  for (const source of calendars) {
    const response = await fetchCalendar(validateCalendarUrl(source.upstreamUrl), {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`Calendar returned HTTP ${response.status}.`)
    const text = await readCalendar(response)
    const events = await ical.async.parseICS(text)
    const term = currentAcademicTerm(now)
    const matching = Object.values(events).filter(
      (event): event is VEvent & { summary: string; end: Date } =>
        event?.type === 'VEVENT' &&
        typeof event.summary === 'string' &&
        event.start instanceof Date &&
        event.start.getTime() > term.start &&
        event.start.getTime() < term.end &&
        event.end instanceof Date &&
        /^(\w{2,4} \d{4} \d{3}) - (.+)$/.test(event.summary)
    )
    if (!matching.length) throw new Error('No courses found in this calendar.')

    await db.transaction(async ({ drizzle }) => {
      const rooms = await drizzle.select().from(room)
      for (const event of matching) {
        const match = /^(\w{2,4} \d{4} \d{3}) - (.+)$/.exec(event.summary)!
        const [buildingCode, roomNumber] = match[2].trim().split(/\s+/)
        const foundRoom = rooms.find(
          (item) => item.buildingCode === buildingCode && item.roomNumber === roomNumber
        )
        if (!foundRoom) throw new Error(`No room found for ${match[2]}. Sync rooms first.`)
        const existing = await drizzle
          .select()
          .from(course)
          .where(eq(course.calendarEventId, event.uid))
        if (existing[0] && existing[0].userId !== userId)
          throw new Error('A calendar event belongs to another user.')
        const id = existing[0]?.id ?? crypto.randomUUID()
        const now = Date.now()
        const values = {
          calendarId: source.id,
          calendarEventName: event.summary,
          courseName: match[1],
          roomId: foundRoom.id,
          calendarEventLastModified: event.lastmodified?.getTime() ?? now,
          updatedAt: now,
        }
        if (existing[0]) await drizzle.update(course).set(values).where(eq(course.id, id))
        else
          await drizzle
            .insert(course)
            .values({ ...values, id, userId, calendarEventId: event.uid, createdAt: now })

        const occurrences = sessionTimes(event)
        const existingSessions = await drizzle
          .select()
          .from(courseSession)
          .where(eq(courseSession.courseId, id))
        const keys = new Set(occurrences.map((item) => `${item.startTime}:${item.endTime}`))
        for (const old of existingSessions) {
          // Never delete a user's attendance when a calendar event is changed.
          if (old.attendance === null && !keys.has(`${old.startTime}:${old.endTime}`)) {
            await drizzle.delete(courseSession).where(eq(courseSession.id, old.id))
          }
        }
        for (const occurrence of occurrences) {
          await drizzle
            .insert(courseSession)
            .values({ id: crypto.randomUUID(), courseId: id, ...occurrence, createdAt: now })
            .onConflictDoNothing()
        }
        imported++
      }
    })
  }
  return { imported }
}
