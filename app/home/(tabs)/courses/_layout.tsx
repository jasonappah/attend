import { Stack } from 'one'
import { Platform } from 'react-native'
export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Courses',
          headerShown: Platform.OS !== 'web',
          headerLargeTitleEnabled: true,
        }}
      />
    </Stack>
  )
}
