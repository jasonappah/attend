import { useQuery } from '@rocicorp/zero/react'
import { useState } from 'react'
import { Linking } from 'react-native'
import { Button, H2, H3, Input, Paragraph, XStack, YStack } from 'tamagui'
import { env } from '~/env'
import { TimelineImport } from '~/timeline/TimelineImport'
import { trpc } from '~/trpc/client'
import { queries } from '~/zero/queries'

export default function SettingsPage() {
  const addCoursesFromIcs = trpc.utils.addCoursesFromIcs.useMutation()
  const syncRoomsFromConcept3dMap = trpc.utils.syncRoomsFromConcept3dMap.useMutation()
  const [calendars, calendarQuery] = useQuery(queries.calendars())
  const [url, setUrl] = useState('')
  const addCalendar = trpc.utils.addCalendar.useMutation({ onSuccess: () => setUrl('') })
  const removeCalendar = trpc.utils.removeCalendar.useMutation()

  return (
    <>
      <H2>Settings</H2>
      <YStack gap="3" width="100%">
        <H3>Calendars</H3>
        <Paragraph>Add a Google Calendar iCal URL to import your classes.</Paragraph>
        {calendarQuery.type === 'error' && <Paragraph>Could not load calendars.</Paragraph>}
        {calendars.map((calendar) => (
          <XStack key={calendar.id} gap="2" items="center">
            <Paragraph flex={1} numberOfLines={2}>
              {calendar.upstreamUrl}
            </Paragraph>
            <Button
              disabled={removeCalendar.isPending}
              onPress={() => removeCalendar.mutate({ id: calendar.id })}
            >
              Remove
            </Button>
          </XStack>
        ))}
        <Input
          accessibilityLabel="Google Calendar iCal URL"
          placeholder="Google Calendar iCal URL"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
        />
        <Button
          disabled={!url.trim() || addCalendar.isPending}
          onPress={() => addCalendar.mutate({ url: url.trim() })}
        >
          Add calendar
        </Button>
        {addCalendar.error && <Paragraph>{addCalendar.error.message}</Paragraph>}
        {removeCalendar.error && <Paragraph>{removeCalendar.error.message}</Paragraph>}
      </YStack>
      <TimelineImport />
      {env.NODE_ENV === 'development' && (
        <Button onPress={() => void Linking.openURL('http://localhost:4983')}>
          Open Drizzle Studio
        </Button>
      )}
      <Button onPress={() => addCoursesFromIcs.mutate()}>Resync Courses from Calendar</Button>
      <Button onPress={() => syncRoomsFromConcept3dMap.mutate()}>
        Resync Rooms from Concept3D Map
      </Button>
    </>
  )
}
