import { useZero } from "@rocicorp/zero/react";
import { Fragment } from "react/jsx-runtime";
import { H2, Button } from "tamagui";
import { AttendanceHistory } from "~/interface/attendance-history/attendance-history";
import type { Schema } from "~/zero/schema";
import { useZeroQuery } from "~/zero/zero";

export default function AttendanceHistoryPage() {
  const zero = useZero<Schema>();
  const [courses] = useZeroQuery((q) => q.course.orderBy("courseName", "asc"));
  const [sessions] = useZeroQuery((q) =>
    q.courseSession.orderBy("startTime", "asc"),
  );

  return (
    <Fragment>
      <H2>Attendance History</H2>
      <Button
        onPress={async () => {
          await zero.mutateBatch(async (trx) => {
            for (const session of sessions) {
              const rand = Math.random();
              await trx.courseSession.update({
                id: session.id,
                attendance: rand > 1 / 2 ? "present" : "absent",
                // attendance: rand > 2 / 3 ? "present" : rand > 1 / 3 ? "absent" : undefined,
              });
            }
          });
        }}
      >
        Randomize Attendance
      </Button>
      <AttendanceHistory courses={courses} sessions={sessions} />
    </Fragment>
  );
}
