import { One } from 'one'
import { useCallback, useEffect, useState } from 'react'
import { showToast } from 'takeout-ui/toast/Toast'
import { isWeb, Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { listRuns, recordRun } from '~/features/background-tasks/localDb'
import { BACKGROUND_TASKS } from '~/features/background-tasks/tasks'
import { SettingsWebChrome } from '~/features/settings/SettingsWebChrome'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { EmptyState } from '~/interface/layout/EmptyState'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import { SepHeading } from '~/interface/text/Headings'

export default function DiagnosticsScreen() {
  if (isWeb) {
    return (
      <SettingsWebChrome>
        <DiagnosticsContent />
      </SettingsWebChrome>
    )
  }
  return <DiagnosticsContent />
}

type TaskRun = {
  id: string
  task: string
  ranAt: number
  batteryLevel: number | null
  batteryState: string | null
  lowPowerMode: boolean | null
  deviceModel: string | null
  deviceSystemName: string | null
  deviceSystemVersion: string | null
  isSimulator: boolean | null
}

// one-line summary of the system state when the task ran: battery level and
// charging state, plus a low-power-mode flag. null fields mean the read was
// unavailable on that platform.
function systemStatusLabel(row: TaskRun): string {
  const parts: string[] = []
  if (row.batteryLevel != null && row.batteryLevel >= 0) {
    parts.push(`${Math.round(row.batteryLevel * 100)}%`)
  } else {
    parts.push('battery n/a')
  }
  if (row.batteryState) {
    parts.push(row.batteryState)
  }
  if (row.lowPowerMode === true) {
    parts.push('low power mode')
  }
  if (row.deviceModel || row.deviceSystemName) {
    parts.push(`${row.deviceModel ?? ''} ${row.deviceSystemName ?? ''}`.trim())
  }
  if (row.isSimulator === true) {
    parts.push('simulator')
  }
  return parts.join(' • ')
}

function DiagnosticsContent() {
  const [runs, setRuns] = useState<TaskRun[]>([])
  const [loading, setLoading] = useState(false)

  const refreshRuns = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listRuns(200)
      setRuns(rows)
    } catch (error) {
      showToast('Could not read background task runs', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshRuns()
  }, [refreshRuns])

  const armTasks = useCallback(async () => {
    try {
      await Promise.all(
        Object.entries(BACKGROUND_TASKS).map(([identifier]) =>
          One.BackgroundTasks.submit(identifier, { earliestBeginDateMs: Date.now() })
        )
      )
      showToast('Background tasks armed — each task re-submits itself when it runs')
      void refreshRuns()
    } catch (error) {
      showToast('Could not arm background tasks', { type: 'error' })
    }
  }, [refreshRuns])

  const exportDatabase = useCallback(async () => {
    try {
      const directories = One.FileSystem.getDirectories()
      const candidates = [directories.documents, directories.cache, directories.applicationSupport]
      let databaseDir: string | null = null
      for (const candidate of candidates) {
        const info = await One.FileSystem.getInfo(candidate)
        if (info.exists && info.isDirectory) {
          databaseDir = candidate
          break
        }
      }
      if (!databaseDir) {
        showToast('No local database file found yet', { type: 'warning' })
        return
      }
      const entries = await One.FileSystem.readDirectory(databaseDir)
      const files = entries.filter((entry) => !entry.isDirectory)
      if (files.length === 0) {
        showToast('No local database file found yet', { type: 'warning' })
        return
      }
      const stamp = Date.now()
      const exportFolder = new URL(`background-task-export-${stamp}/`, directories.cache)
      await One.FileSystem.makeDirectory(exportFolder.href)
      const exported = await Promise.all(
        files.map(async (entry) => {
          const fileName = `${stamp}-${entry.name}`
          await One.FileSystem.copy(
            new URL(entry.name, databaseDir).href,
            new URL(fileName, exportFolder.href).href
          )
          return { type: 'file' as const, value: new URL(fileName, exportFolder.href).href }
        })
      )
      await One.Share.share(exported)
    } catch (error) {
      showToast('Could not export the database', { type: 'error' })
    }
  }, [])

  return (
    <PageScrollView contentPaddingTop={16}>
      <YStack flex={1} flexBasis="auto" pb={60} gap="12">
        <SepHeading>Background tasks</SepHeading>
        <Paragraph size="3" color="color-11">
          Four background tasks are registered — every minute, every ten minutes, every hour, and
          every thirty minutes. each task re-submits itself from its handler, so this log shows when
          the operating system actually launched each run, not when we asked for it. arm the tasks,
          leave the app in the background, then come back and compare the times against the
          intervals.{' '}
          {isWeb ? (
            <>
              on web, submission validates but the OS never launches anything — background tasks are
              a native-only feature.
            </>
          ) : null}
        </Paragraph>

        <XStack px={18} py={13} items="center" justify="space-between" gap={13}>
          <YStack flex={1} gap="0-5">
            <SizableText size="4" fontWeight="500">
              Arm background tasks
            </SizableText>
            <Paragraph size="2" color="color-11">
              Submits one run of every task to the operating system.
            </Paragraph>
          </YStack>
          <Button
            accent
            onPress={armTasks}
            testID="diagnostics-arm-tasks"
            disabled={loading || isWeb}
          >
            {isWeb ? 'Not available on web' : 'Arm'}
          </Button>
        </XStack>

        <SepHeading>Task runs</SepHeading>
        {runs.length === 0 ? (
          <EmptyState
            icon={<Icons.Settings size={40} color="color-11" />}
            title="No background task runs yet"
            description={
              isWeb
                ? 'Background tasks are a native-only feature. run the app on a device to see task runs here.'
                : 'Arm the tasks above, then wait for the OS to launch them.'
            }
            ctaLabel="Arm tasks"
            onCtaPress={armTasks}
          />
        ) : (
          <>
            <YStack testID="diagnostics-runs-list">
              {runs.map((row, index) => (
                <XStack
                  key={row.id}
                  px={18}
                  py={10}
                  items="center"
                  justify="space-between"
                  gap={13}
                  testID={`diagnostics-run-${index}`}
                >
                  <YStack flex={1} gap="0-5">
                    <SizableText size="4">{row.task}</SizableText>
                    <Paragraph size="2" color="color-11">
                      {new Date(row.ranAt).toLocaleString()}
                    </Paragraph>
                    <SizableText size="2" color="color-10">
                      {systemStatusLabel(row)}
                    </SizableText>
                  </YStack>
                  <SizableText size="3" color="color-10" textAlign="right">
                    {new Date(row.ranAt).toLocaleTimeString()}
                  </SizableText>
                </XStack>
              ))}
            </YStack>
            <Button size="xs" subtle onPress={refreshRuns} testID="diagnostics-refresh-runs">
              Refresh
            </Button>
          </>
        )}

        {!isWeb ? (
          <>
            <SepHeading>Export database</SepHeading>
            <Paragraph size="3" color="color-11">
              Copies the local SQLite database file into the app's cache folder and opens the system
              share sheet, so you can pull the file off the device and inspect when each task really
              ran.
            </Paragraph>
            <Button onPress={exportDatabase} testID="diagnostics-export-database">
              Export SQLite database
            </Button>
          </>
        ) : null}
      </YStack>
    </PageScrollView>
  )
}
