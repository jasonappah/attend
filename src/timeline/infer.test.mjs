import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inferAttendance, parseVisits } from './infer.ts'

const start = Date.parse('2026-01-01T12:00:00Z')
const end = start + 60 * 60 * 1000
const session = {
  id: '1',
  startTime: start,
  endTime: end,
  attendance: null,
  course: { room: { latitude: 32, longitude: -96 } },
}

function visit(latLng, from = start, to = end) {
  return {
    startTime: new Date(from).toISOString(),
    endTime: new Date(to).toISOString(),
    visit: { topCandidate: { placeLocation: { latLng } } },
  }
}

test('infers visits near and far, but not missing or incomplete data', () => {
  assert.deepEqual(
    inferAttendance(
      parseVisits({ semanticSegments: [visit('32.0000000°, -96.0000000°')] }),
      [session],
      end + 1
    ),
    [{ id: '1', attendance: 'present' }]
  )
  assert.deepEqual(
    inferAttendance(
      parseVisits({ semanticSegments: [visit('32.1°, -96.1°')] }),
      [session],
      end + 1
    ),
    [{ id: '1', attendance: 'absent' }]
  )
  assert.deepEqual(
    inferAttendance(
      parseVisits({ semanticSegments: [visit('32.1°, -96.1°', start, start + 1000)] }),
      [session],
      end + 1
    ),
    []
  )
  assert.deepEqual(inferAttendance([], [session], end + 1), [])
})

test('does not infer future sessions or overwrite existing attendance', () => {
  const visits = parseVisits({ semanticSegments: [visit('32°, -96°')] })
  assert.deepEqual(inferAttendance(visits, [session], start), [])
  assert.deepEqual(inferAttendance(visits, [{ ...session, attendance: 'absent' }], end + 1), [])
})

test('rejects unsupported files', () => {
  assert.throws(() => parseVisits({ locations: [] }))
})
