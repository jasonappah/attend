import { useQuery, useZero } from '@rocicorp/zero/react'
import { useState } from 'react'
import { Button, H3, Paragraph, XStack, YStack } from 'tamagui'
import { mutators } from '~/zero/mutators'
import { queries } from '~/zero/queries'
import { inferAttendance, parseVisits } from './infer'

type Result = { id: string; attendance: 'present' | 'absent' }

export function TimelineImport() {
  const zero = useZero()
  const [sessions, query] = useQuery(queries.sessionsWithRooms())
  const [results, setResults] = useState<Result[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function readFile(file: File | undefined) {
    setResults([])
    setMessage('')
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      setMessage('The file is too large. Choose a Timeline JSON file under 100 MB.')
      return
    }
    setBusy(true)
    try {
      const visits = parseVisits(JSON.parse(await file.text()))
      if (!visits.length) throw new Error('No usable visits found in this Timeline file.')
      const inferred = inferAttendance(visits, sessions)
      setResults(inferred)
      setMessage(
        `${inferred.filter((r) => r.attendance === 'present').length} present, ${inferred.filter((r) => r.attendance === 'absent').length} absent. Only unmarked past classes with sufficient visit data are included.`
      )
    } catch {
      setMessage('Could not read usable visits from this Timeline JSON file.')
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    setBusy(true)
    try {
      for (let i = 0; i < results.length; i += 500) {
        const result = await zero.mutate(
          mutators.courseSession.importAttendance({ sessions: results.slice(i, i + 500) })
        ).server
        if (result.type === 'error') throw new Error('Attendance could not be saved.')
      }
      setResults([])
      setMessage('Attendance imported. Existing attendance was not overwritten.')
    } catch {
      setMessage('Could not save all attendance. You can select the file and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack gap="3" width="100%">
      <H3>Google Maps Timeline</H3>
      <Paragraph>
        Your file stays on this device. Estimates use visit locations and may be inaccurate; check
        them before applying. Existing attendance is never overwritten.
      </Paragraph>
      <input
        aria-label="Google Maps Timeline JSON"
        type="file"
        accept=".json,application/json"
        disabled={query.type !== 'complete' || busy}
        onChange={(event) => {
          void readFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {query.type === 'error' && <Paragraph>Could not load classes.</Paragraph>}
      {!!message && <Paragraph>{message}</Paragraph>}
      {results.map((result) => {
        const session = sessions.find((item) => item.id === result.id)
        return (
          <XStack key={result.id} gap="2" items="center">
            <Paragraph flex={1}>
              {session?.course?.courseName} ·{' '}
              {session && new Date(session.startTime).toLocaleString()} · {result.attendance}
            </Paragraph>
            <Button
              disabled={busy}
              onPress={() =>
                setResults((current) => current.filter((item) => item.id !== result.id))
              }
            >
              Exclude
            </Button>
          </XStack>
        )
      })}
      {results.length > 0 && (
        <Button disabled={busy} onPress={() => void apply()}>
          Apply attendance estimates
        </Button>
      )}
    </YStack>
  )
}
