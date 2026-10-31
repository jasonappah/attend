import { Button, H2 } from 'tamagui'
import { trpc } from '~/trpc/client'

export default function SettingsPage() {
  const addCoursesFromIcs = trpc.utils.addCoursesFromIcs.useMutation()
  const syncRoomsFromConcept3dMap = trpc.utils.syncRoomsFromConcept3dMap.useMutation()

  return (
    <>
      <H2>Settings</H2>
      <Button onPress={() => addCoursesFromIcs.mutate()}>Resync Courses from Calendar</Button>
      <Button onPress={() => syncRoomsFromConcept3dMap.mutate()}>
        Resync Rooms from Concept3D Map
      </Button>
    </>
  )
}
