import { afterAll, beforeAll, expect, mock, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { createLocalApplicationSqlClientFactory } from 'orez-lite/local'
import { migrateApplicationDatabase } from '../../database/migrate'
import { calendar, course, courseSession, room } from '../../database/schema'

mock.module('server-only', () => ({}))
const path = mkdtempSync(join(tmpdir(), 'attend-calendar-test-'))
const factory = createLocalApplicationSqlClientFactory({ dataDir: path })
const previous = Reflect.get(globalThis, '__soot_cf_application_sql_client')

beforeAll(async () => {
  Reflect.set(globalThis, '__soot_cf_application_sql_client', factory)
  await migrateApplicationDatabase((work) => factory('singleton').transaction(() => { throw new Error('unexpected query') }, work))
})
afterAll(async () => {
  await factory.close()
  Reflect.set(globalThis, '__soot_cf_application_sql_client', previous)
  rmSync(path, { recursive: true })
})

test('imports and resyncs calendar sessions without erasing attendance', async () => {
  const { syncedDb } = await import('../../database/syncedDb')
  const { syncCalendars } = await import('./calendarSync')
  const db = syncedDb('test-user')
  const now = Date.now()
  await db.transaction(async ({ drizzle }) => {
    await drizzle.insert(calendar).values({ id: 'cal', userId: 'test-user', upstreamUrl: 'https://calendar.google.com/calendar/ical/test/basic.ics', createdAt: now })
    await drizzle.insert(room).values({ id: 'room', buildingCode: 'ECSS', roomNumber: '2.102', latitude: 32, longitude: -96, level: 2, concept3dMapId: 1, concept3dCategoryName: 'Classroom', concept3dLocationId: 1, concept3dCategoryId: 1, concept3dRoomId: 1, createdAt: now })
  })
  const ics = (count: number) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:test-event', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261001T100000Z', 'DTEND:20261001T110000Z', `RRULE:FREQ=WEEKLY;COUNT=${count}`, 'SUMMARY:CS 1234 001 - ECSS 2.102', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const request = (count: number) => async () => new Response(ics(count), { status: 200 })
  expect(await syncCalendars('test-user', request(3))).toEqual({ imported: 1 })
  let rows = await db.transaction(({ drizzle }) => drizzle.select().from(courseSession))
  expect(rows).toHaveLength(3)
  const last = rows.find((row) => row.startTime === Date.parse('2026-10-15T10:00:00Z'))!
  await db.transaction(({ drizzle }) => drizzle.update(courseSession).set({ attendance: 'present' }).where(eq(courseSession.id, last.id)))
  expect(await syncCalendars('test-user', request(1))).toEqual({ imported: 1 })
  rows = await db.transaction(({ drizzle }) => drizzle.select().from(courseSession))
  expect(rows).toHaveLength(2)
  expect(rows.find((row) => row.id === last.id)?.attendance).toBe('present')
  const courses = await db.transaction(({ drizzle }) => drizzle.select().from(course))
  expect(courses[0].courseName).toBe('CS 1234 001')
})
