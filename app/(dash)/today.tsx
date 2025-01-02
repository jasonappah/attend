import { ToggleThemeButton } from "~/interface/theme/ThemeToggleButton";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useRef } from "react";
import {
  Button,
  H2,
  Text,
  Paragraph,
  SizableText,
  XStack,
  YStack,
  isWeb,
} from "tamagui";
import { authClient, useAuth } from "~/better-auth/authClient";
import { Avatar } from "~/interface/Avatar";
import { Table } from "~/interface/Table";
import { isTauri } from "~/tauri/constants";
import { trpc } from "~/trpc/client";
import type { Course, CourseSession } from "~/zero/schema";
import { useQuery } from "~/zero/zero";

const columnHelper = createColumnHelper<CourseSession & { course: Course }>();
const columns = [
  columnHelper.accessor("course.courseName", {
    header: "Course",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("course.roomNumber", {
    header: "Room",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("startTime", {
    // TODO: figure out why times are offset. i love timezones 😭
    header: "Start",
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
  columnHelper.accessor("endTime", {
    header: "End",
    cell: (info) => new Date(info.getValue()).toLocaleTimeString(),
  }),
  columnHelper.accessor("attendance", {
    header: "Attendance",
    cell: (info) => info.getValue(),
  }),
];

export default function TodayPage() {
  const { user, jwtToken, session } = useAuth();
  const now = new Date(2024, 10, 19);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const [rawSessionsToday] = useQuery((q) =>
    q.courseSession
      .where("startTime", ">=", startOfDay.getTime())
      .where("endTime", "<", endOfDay.getTime())
      .related("course"),
  );

  const sessionsToday = useMemo(() => {
    return rawSessionsToday.map((session) => ({
      ...session,
      course: session.course[0],
    }));
  }, [rawSessionsToday]);

  const addCoursesFromIcs = trpc.courses.addCoursesFromIcs.useMutation();
  const table = useReactTable({
    data: sessionsToday,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const headerGroups = table.getHeaderGroups();
  const tableRows = table.getRowModel().rows;
  const footerGroups = table.getFooterGroups();

  const allRowsLength =
    tableRows.length + headerGroups.length + footerGroups.length;
  const rowCounter = useRef(-1);
  rowCounter.current = -1;
  return (
    <YStack
      $platform-ios={{ pt: "$10" }}
      f={1}
      p="$4"
      gap="$4"
      ai="flex-start"
      maw={600}
      w="100%"
      als="center"
    >
      <XStack ai="center" gap="$4">
        <Avatar image={user?.image || ""} />
        <SizableText>{user?.name}</SizableText>

        <Button onPress={() => authClient.signOut()}>Logout</Button>

        {isWeb && !isTauri && jwtToken && (
          <a href={`one-zero://finish-auth?token=${session?.token}`}>
            <Button>Login in Tauri</Button>
          </a>
        )}
        <ToggleThemeButton />
      </XStack>

      <Button onPress={() => addCoursesFromIcs.mutate()}>
        Resync Courses from Calendar
      </Button>

      <H2>Today</H2>
      {sessionsToday.length === 0 ? (
        <Paragraph>No classes today. Make smart choices 😉</Paragraph>
      ) : (
        <Table
          alignCells={{ x: "center", y: "center" }}
          alignHeaderCells={{ y: "center", x: "center" }}
          cellWidth="$18"
          cellHeight="$7"
          borderWidth={0}
          padding="$4"
          maxWidth="100%"
          maxHeight={600}
          gap="$5"
        >
          <Table.Head>
            {headerGroups.map((headerGroup) => {
              rowCounter.current++;
              return (
                <Table.Row
                  rowLocation={
                    rowCounter.current === 0
                      ? "first"
                      : rowCounter.current === allRowsLength - 1
                        ? "last"
                        : "middle"
                  }
                  key={headerGroup.id}
                  justifyContent="flex-start"
                >
                  {headerGroup.headers.map((header) => (
                    <Table.HeaderCell
                      cellLocation="middle"
                      key={header.id}
                      borderWidth={0}
                      justifyContent="flex-start"
                      flexShrink={3}
                    >
                      <Text>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </Text>
                    </Table.HeaderCell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Head>
          <Table.Body>
            {tableRows.map((row) => {
              rowCounter.current++;
              return (
                <Table.Row
                  hoverStyle={{
                    backgroundColor: "$color2",
                  }}
                  rowLocation={
                    rowCounter.current === 0
                      ? "first"
                      : rowCounter.current === allRowsLength - 1
                        ? "last"
                        : "middle"
                  }
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell
                      cellLocation="middle"
                      key={cell.id}
                      borderWidth={0}
                      justifyContent="flex-start"
                      flexShrink={3}
                    >
                      <Text theme="alt1">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Text>
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
    </YStack>
  );
}
