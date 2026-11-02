import { useState } from 'react'
import { dialogConfirm } from 'takeout-ui/dialog/confirm'
import { Input } from 'takeout-ui/forms/Input'
import { H3, Paragraph, XStack, YStack } from 'tamagui'
import { calendars } from '~/data/calendar/queries'
import { useQuery } from '~/data/zero-client'
import { trpc } from '~/features/app/trpc-client'
import { Button } from '~/interface/buttons/Button'

export function CalendarSettings() {
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [items] = useQuery(calendars)
  const add = trpc.addCalendar.useMutation()
  const remove = trpc.removeCalendar.useMutation()
  const sync = trpc.syncCalendars.useMutation()
  const rooms = trpc.syncRooms.useMutation()
  const busy = add.isPending || remove.isPending || sync.isPending || rooms.isPending

  async function perform(action: () => Promise<unknown>, success: string) {
    setMessage('')
    try {
      await action()
      setMessage(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed.')
    }
  }

  return (
    <YStack gap={10} mt={20}>
      <H3>Calendars</H3>
      <Paragraph color="color-10">
        Add a private Google Calendar iCal link to import your courses.
      </Paragraph>
      <Input
        aria-label="Google Calendar iCal URL"
        placeholder="Google Calendar iCal URL"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
      />
      <XStack gap={8} flexWrap="wrap">
        <Button
          disabled={busy || !url.trim()}
          onPress={() =>
            void perform(async () => {
              await add.mutateAsync({ url: url.trim() })
              setUrl('')
            }, 'Calendar added.')
          }
        >
          Add calendar
        </Button>
        <Button
          disabled={busy}
          onPress={() =>
            void (async () => {
              const confirmed = await dialogConfirm({
                title: 'Sync courses?',
                description:
                  'Sessions no longer in the calendar may be removed if they have no attendance. Recorded attendance is kept.',
                confirmLabel: 'Sync',
                destructive: true,
              })
              if (confirmed) await perform(() => sync.mutateAsync(), 'Courses synced.')
            })()
          }
        >
          Sync courses
        </Button>
        <Button
          disabled={busy}
          subtle
          onPress={() => void perform(() => rooms.mutateAsync(), 'Rooms synced.')}
        >
          Sync rooms
        </Button>
      </XStack>
      {message ? <Paragraph>{message}</Paragraph> : null}
      {items.map((item) => (
        <XStack key={item.id} gap={8} items="center">
          <Paragraph flex={1} numberOfLines={1}>
            Google Calendar
          </Paragraph>
          <Button
            size="sm"
            subtle
            disabled={busy}
            onPress={() =>
              void (async () => {
                if (
                  await dialogConfirm({
                    title: 'Remove calendar?',
                    description: 'Imported courses will remain.',
                    destructive: true,
                    confirmLabel: 'Remove',
                  })
                ) {
                  await perform(() => remove.mutateAsync({ id: item.id }), 'Calendar removed.')
                }
              })()
            }
          >
            Remove
          </Button>
        </XStack>
      ))}
    </YStack>
  )
}
