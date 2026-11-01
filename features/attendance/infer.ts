type Visit = { start: number; end: number; latitude: number; longitude: number }
type Session = {
  id: string
  startTime: number
  endTime: number
  attendance: string | null
  course: { room: { latitude: number; longitude: number } | null | undefined } | null | undefined
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>) : undefined
}

export function parseVisits(data: unknown): Visit[] {
  const segments = record(data)?.semanticSegments
  if (!Array.isArray(segments)) throw new Error('This is not a supported Google Timeline JSON export.')
  const visits: Visit[] = []
  for (const item of segments) {
    const segment = record(item)
    const candidate = record(record(segment?.visit)?.topCandidate)
    const latLng = record(candidate?.placeLocation)?.latLng
    if (typeof latLng !== 'string' || typeof segment?.startTime !== 'string' || typeof segment.endTime !== 'string') continue
    const match = /^(?:geo:)?\s*(-?\d+(?:\.\d+)?)°?,\s*(-?\d+(?:\.\d+)?)°?$/.exec(latLng)
    if (!match) continue
    const latitude = Number(match[1]), longitude = Number(match[2])
    const start = Date.parse(segment.startTime), end = Date.parse(segment.endTime)
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      visits.push({ start, end, latitude, longitude })
    }
  }
  return visits.sort((a, b) => a.start - b.start)
}

function distance(a: Visit, b: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180
  const lat = (b.latitude - a.latitude) * radians, lon = (b.longitude - a.longitude) * radians
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(lon / 2) ** 2
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function inferAttendance(visits: Visit[], sessions: readonly Session[], now = Date.now()) {
  const results: { id: string; attendance: 'present' | 'absent' }[] = []
  for (const session of sessions) {
    const room = session.course?.room
    const duration = session.endTime - session.startTime
    if (!room || session.attendance !== null || duration <= 0 || session.endTime > now) continue
    let near = false, nearEvidence = false, farCovers = false
    for (const visit of visits) {
      if (visit.start >= session.endTime) break
      const overlap = Math.min(visit.end, session.endTime) - Math.max(visit.start, session.startTime)
      if (overlap <= 0) continue
      const meters = distance(visit, room)
      if (meters <= 300) nearEvidence = true
      if (meters <= 150 && overlap >= duration * 0.5) near = true
      if (meters > 300 && overlap >= duration * 0.9) farCovers = true
    }
    if (near) results.push({ id: session.id, attendance: 'present' })
    else if (farCovers && !nearEvidence) results.push({ id: session.id, attendance: 'absent' })
  }
  return results
}
