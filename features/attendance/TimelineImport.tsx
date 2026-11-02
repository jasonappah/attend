import { useState } from 'react'
import { showToast } from 'takeout-ui/toast/Toast'
import { H3, Paragraph, XStack, YStack } from 'tamagui'
import { sessions } from '~/data/courseSession/queries'
import { useQuery, zero } from '~/data/zero-client'
import { getOnline } from '~/features/app/onlineState'
import { Button } from '~/interface/buttons/Button'
import { inferAttendance, parseVisits } from './infer'

type Result = { id: string; attendance: 'present' | 'absent' }

export function TimelineImport() {
  const [items, query] = useQuery(sessions)
  const [results, setResults] = useState<Result[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function readFile(file?: File) {
    setResults([])
    setMessage('')
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      setMessage('Choose a Timeline JSON file under 100 MB.')
      return
    }
    setBusy(true)
    try {
      const visits = parseVisits(JSON.parse(await file.text()))
      if (!visits.length) throw new Error('No usable visits')
      const inferred = inferAttendance(visits, items)
      setResults(inferred)
      setMessage(
        `${inferred.filter((r) => r.attendance === 'present').length} present, ${inferred.filter((r) => r.attendance === 'absent').length} absent. Only unmarked past classes with sufficient data are included.`
      )
    } catch {
      setMessage('Could not read usable visits from this Timeline JSON file.')
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!getOnline()) {
      showToast('You appear to be offline', { type: 'warning' })
      return
    }
    setBusy(true)
    try {
      for (const result of results) {
        const response = await zero.mutate.courseSession.importAttendance(result).server
        if (response.type === 'error') throw new Error('Could not save attendance')
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
    <YStack gap={10} mt={24}>
      <H3>Google Maps Timeline</H3>
      <Paragraph>
        Your file stays on this device. Estimates can be inaccurate; review them before applying.
        Existing attendance is never overwritten.
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
      {query.type === 'error' ? <Paragraph>Could not load classes.</Paragraph> : null}
      {message ? <Paragraph>{message}</Paragraph> : null}
      {results.map((result) => {
        const item = items.find((session) => session.id === result.id)
        return (
          <XStack key={result.id} gap={8} items="center">
            <Paragraph flex={1}>
              {item?.course?.courseName} · {item && new Date(item.startTime).toLocaleString()} ·{' '}
              {result.attendance}
            </Paragraph>
            <Button
              size="sm"
              disabled={busy}
              onPress={() =>
                setResults((current) => current.filter((entry) => entry.id !== result.id))
              }
            >
              Exclude
            </Button>
          </XStack>
        )
      })}
      {results.length ? (
        <Button disabled={busy} onPress={() => void apply()}>
          Apply attendance estimates
        </Button>
      ) : null}
    </YStack>
  )
}
