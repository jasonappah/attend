import { describe, expect, test } from 'bun:test'
import { inferAttendance, parseVisits } from './infer'

const start = Date.parse('2026-01-01T12:00:00Z')
const end = start + 3_600_000
const session = { id: '1', startTime: start, endTime: end, attendance: null, course: { room: { latitude: 32, longitude: -96 } } }
const visit = (latLng: string, from = start, to = end) => ({
  startTime: new Date(from).toISOString(), endTime: new Date(to).toISOString(),
  visit: { topCandidate: { placeLocation: { latLng } } },
})

describe('Timeline attendance inference', () => {
  test('marks near visits present and long far visits absent', () => {
    expect(inferAttendance(parseVisits({ semanticSegments: [visit('32°, -96°')] }), [session], end + 1)).toEqual([{ id: '1', attendance: 'present' }])
    expect(inferAttendance(parseVisits({ semanticSegments: [visit('32.1°, -96.1°')] }), [session], end + 1)).toEqual([{ id: '1', attendance: 'absent' }])
  })
  test('does not guess from incomplete visits, future classes, or marked sessions', () => {
    const visits = parseVisits({ semanticSegments: [visit('32°, -96°')] })
    expect(inferAttendance(visits, [session], start)).toEqual([])
    expect(inferAttendance(visits, [{ ...session, attendance: 'absent' }], end + 1)).toEqual([])
    expect(inferAttendance(parseVisits({ semanticSegments: [visit('32.1°, -96.1°', start, start + 1000)] }), [session], end + 1)).toEqual([])
  })
  test('rejects unsupported files and skips invalid coordinates', () => {
    expect(() => parseVisits({ locations: [] })).toThrow()
    expect(parseVisits({ semanticSegments: [visit('999°, -96°')] })).toEqual([])
  })
})
