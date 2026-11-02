import { describe, expect, test } from 'bun:test'
import ical, { type VEvent } from 'node-ical'
import { currentAcademicTerm, sessionTimes } from './calendarEvents'

function event(lines: string[]): VEvent {
  const input = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:class-1', 'DTSTAMP:20261001T000000Z', ...lines, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return Object.values(ical.sync.parseICS(input)).find((item) => item?.type === 'VEVENT') as VEvent
}

describe('calendar recurrence import', () => {
  test('chooses the fall and spring terms across year boundaries', () => {
    expect(currentAcademicTerm(new Date(2026, 10, 1).getTime())).toEqual({ start: new Date(2026, 7, 1).getTime(), end: new Date(2027, 1, 1).getTime() })
    expect(currentAcademicTerm(new Date(2027, 0, 15).getTime())).toEqual({ start: new Date(2026, 7, 1).getTime(), end: new Date(2027, 1, 1).getTime() })
    expect(currentAcademicTerm(new Date(2027, 2, 1).getTime())).toEqual({ start: new Date(2027, 1, 1).getTime(), end: new Date(2027, 7, 1).getTime() })
  })
  test('imports a non-repeating event', () => {
    expect(sessionTimes(event(['DTSTART:20261001T100000Z', 'DTEND:20261001T110000Z']))).toEqual([
      { startTime: Date.parse('2026-10-01T10:00:00Z'), endTime: Date.parse('2026-10-01T11:00:00Z') },
    ])
  })
  test('honors exclusions and preserves local times through DST', () => {
    const items = sessionTimes(event([
      'DTSTART;TZID=America/Chicago:20261026T100000',
      'DTEND;TZID=America/Chicago:20261026T110000',
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'EXDATE;TZID=America/Chicago:20261102T100000',
    ]))
    expect(items.map((item) => new Date(item.startTime).toISOString())).toEqual([
      '2026-10-26T15:00:00.000Z', '2026-11-09T16:00:00.000Z',
    ])
  })
  test('rejects a zero-duration event', () => {
    expect(() => sessionTimes(event(['DTSTART:20261001T100000Z', 'DTEND:20261001T100000Z']))).toThrow()
  })
})
