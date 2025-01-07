import {
  type ExpressionBuilder,
  NOBODY_CAN,
  type Row,
  type TableSchema,
  createSchema,
  definePermissions,
} from "@rocicorp/zero";

import * as drizzleSchema from "~/db/schema";
import { createZeroSchema } from "drizzle-zero";

const timestamps = {
  createdAt: true,
  updatedAt: true,
};
export const schema = createSchema(
  createZeroSchema(drizzleSchema, {
    version: 1,
    tables: {
      user: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        ...timestamps,
      },
      course: {
        id: true,
        calendarEventName: true,
        courseName: true,
        roomId: true,
        userId: true,
        calendarId: true,
        calendarEventId: true,
        calendarEventLastModified: true,
        ...timestamps,
      },
      courseSession: {
        id: true,
        courseId: true,
        attendance: true,
        startTime: true,
        endTime: true,
        ...timestamps,
      },
      calendar: {
        id: true,
        upstreamUrl: true,
        userId: true,
        ...timestamps,
      },
      room: {
        id: true,
        buildingCode: true,
        roomNumber: true,
        latitude: true,
        longitude: true,
        level: true,
        concept3dMapId: true,
        concept3dShape: true,
        concept3dCategoryName: true,
        concept3dLocationId: true,
        concept3dCategoryId: true,
        concept3dMarkId: true,
        ...timestamps,
      },
    },
  }),
);

// Define the structure of your JWT auth data
type AuthData = {
  sub: string; // user id
  email: string;
  roles?: string[];
};

export type Schema = typeof schema;
type Tables = Schema["tables"];

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const _isAuthenticated = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<TableSchema>,
  ) => cmpLit(authData.sub, "IS NOT", null);

  const isSelf = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Tables["user"]>,
  ) => cmp("id", "=", authData.sub);

  const isOwner = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Tables["course"] | Tables["calendar"]>,
  ) => cmp("userId", "=", authData.sub);

  const isOwnerOfParentCourse = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Tables["courseSession"]>,
  ) => exists("course", (b) => b.where("userId", "=", authData.sub));

  return {
    user: {
      row: {
        select: [isSelf],
        insert: NOBODY_CAN,
        update: {
          preMutation: NOBODY_CAN,
        },
        delete: NOBODY_CAN,
      },
    },
    course: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },

    courseSession: {
      row: {
        select: [isOwnerOfParentCourse],
        insert: [isOwnerOfParentCourse],
        update: {
          preMutation: [isOwnerOfParentCourse],
        },
        delete: [isOwnerOfParentCourse],
      },
    },
    calendar: {
      row: {
        select: [isOwner],
        insert: [isOwner],
        update: {
          preMutation: [isOwner],
        },
        delete: [isOwner],
      },
    },
  };
});

export type User = Row<typeof schema.tables.user>;
export type Course = Row<typeof schema.tables.course>;
export type CourseSession = Row<typeof schema.tables.courseSession>;
export type Room = Row<typeof schema.tables.room>;
