import { useState } from "react";
import {
  XStack,
  YStack,
  Text,
  Card,
  ScrollView,
  Select,
  Adapt,
} from "tamagui";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Moon,
  X,
} from "@tamagui/lucide-icons";
import { LinearGradient } from "tamagui/linear-gradient";
import type { Course, CourseSession, Schema } from "~/zero/schema";
import type { Attendance } from "~/db/schema";
import { useZero } from "@rocicorp/zero/react";

type AttendanceHistoryProps = {
  courses: readonly Course[];
  sessions: readonly CourseSession[];
};

type AttendanceStatus = Attendance | null;

type AttendanceOption = {
  value: AttendanceStatus;
  label: string;
  icon: React.ReactNode;
};

const attendanceOptions: AttendanceOption[] = [
  { value: "present", label: "Present", icon: <Check size={16} /> },
  // { value: 'PRESENT_ASLEEP', label: 'Present (Asleep)', icon: <Moon size={16}  /> },
  { value: "absent", label: "Skipped", icon: <X size={16} /> },
  // { value: 'CANCELED', label: 'Canceled', icon: <AlertCircle size={16} /> },
  { value: null, label: "No Status", icon: null },
];

const DAYS_TO_SHOW = 14;

export function AttendanceHistory({
  courses,
  sessions,
}: AttendanceHistoryProps) {
  const [startDate] = useState(() => startOfWeek(new Date(2024, 10, 19)));

  const dates = Array.from({ length: DAYS_TO_SHOW }, (_, i) =>
    addDays(startDate, i),
  );

  const getSession = (courseId: string, date: Date) => {
    return sessions.find((session) => {
      const sessionDate = new Date(session.startTime);
      return session.courseId === courseId && isSameDay(sessionDate, date);
    });
  };

  return (
    <Card elevation={2} bordered padding="$4" width="100%">
      <ScrollView horizontal>
        <XStack>
          <YStack>
            <Text height={40} width={80} fontWeight="bold" padding="$2">
              Date
            </Text>
            {dates.map((date) => (
              <Text
                key={date.toISOString()}
                height={40}
                width={80}
                textAlign="center"
                padding="$2"
              >
                {format(date, "M/d")}
              </Text>
            ))}
          </YStack>

          {courses.map((course) => (
            <YStack key={course.id}>
              <Text
                height={40}
                width={200}
                fontWeight="bold"
                padding="$2"
                numberOfLines={1}
              >
                {course.courseName}
              </Text>
              {dates.map((date) => {
                const session = getSession(course.id, date);
                return (
                  <XStack
                    key={date.toISOString()}
                    height={40}
                    width={200}
                    alignItems="center"
                    paddingLeft="$2"
                    borderColor="$borderColor"
                    borderWidth={1}
                  >
                    {session && (
                      <AttendanceSelect
                        sessionId={session.id}
                        currentStatus={session.attendance}
                      />
                    )}
                  </XStack>
                );
              })}
            </YStack>
          ))}
        </XStack>
      </ScrollView>
    </Card>
  );
}

const AttendanceSelect = ({
  sessionId,
  currentStatus,
}: {
  sessionId: string;
  currentStatus: AttendanceStatus;
}) => {
  const zero = useZero<Schema>();
  const currentOption = attendanceOptions.find(
    (opt) => opt.value === currentStatus,
  );
  const handleAttendanceUpdate = async (value: string) => {
    await zero.mutate.courseSession.update({
      id: sessionId,
      attendance: value === "" ? undefined : (value as Attendance),
    });
  };

  return (
    <Select
      id={`session-${sessionId}}`}
      value={currentStatus || ""}
      onValueChange={handleAttendanceUpdate}
    >
      <Select.Trigger width={180} iconAfter={ChevronDown}>
        <Select.Value placeholder="Set status">
          {currentOption?.icon}
          <Text marginLeft="$2">{currentOption?.label}</Text>
        </Select.Value>
      </Select.Trigger>

      {/* <Adapt when="sm" platform="touch" >
        <Select.Sheet
          native
          modal
          dismissOnSnapToBottom
          animationConfig={{
            type: "spring",
            damping: 20,
            mass: 1.2,
            stiffness: 250,
          }}
        >
          <Select.Sheet.Frame>
            <Select.Sheet.ScrollView>
              <Adapt.Contents />
            </Select.Sheet.ScrollView>
          </Select.Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Select.Sheet>
      </Adapt> */}

      <Select.Content>
        <Select.ScrollUpButton
          ai="center"
          jc="center"
          pos="relative"
          w="100%"
          h="$3"
        >
          <YStack zIndex={10}>
            <ChevronUp size={20} />
          </YStack>
          <LinearGradient
            start={[0, 0]}
            end={[0, 1]}
            fullscreen
            colors={["$background", "$backgroundTransparent"]}
            borderRadius="$4"
          />
        </Select.ScrollUpButton>

        <Select.Viewport minWidth={200}>
          <Select.Group>
            {attendanceOptions.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value ?? ""}
                index={0}
              >
                <Select.ItemText>
                  <XStack alignItems="center" space="$2">
                    {option.icon}
                    <Text>{option.label}</Text>
                  </XStack>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>

        <Select.ScrollDownButton
          ai="center"
          jc="center"
          pos="relative"
          w="100%"
          h="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size={20} />
          </YStack>
          <LinearGradient
            start={[0, 0]}
            end={[0, 1]}
            fullscreen
            colors={["$backgroundTransparent", "$background"]}
            borderRadius="$4"
          />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  );
};
