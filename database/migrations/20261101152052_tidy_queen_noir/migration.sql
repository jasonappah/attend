CREATE TABLE `calendar` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`upstreamUrl` text NOT NULL UNIQUE,
	`createdAt` integer NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `course` (
	`id` text PRIMARY KEY,
	`userId` text NOT NULL,
	`calendarId` text,
	`roomId` text NOT NULL,
	`calendarEventName` text NOT NULL,
	`courseName` text NOT NULL,
	`calendarEventId` text NOT NULL UNIQUE,
	`calendarEventLastModified` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	CONSTRAINT `fk_course_calendarId_calendar_id_fk` FOREIGN KEY (`calendarId`) REFERENCES `calendar`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_course_roomId_room_id_fk` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`)
);
--> statement-breakpoint
CREATE TABLE `courseSession` (
	`id` text PRIMARY KEY,
	`courseId` text NOT NULL,
	`attendance` text,
	`startTime` integer NOT NULL,
	`endTime` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	CONSTRAINT `fk_courseSession_courseId_course_id_fk` FOREIGN KEY (`courseId`) REFERENCES `course`(`id`)
);
--> statement-breakpoint
CREATE TABLE `room` (
	`id` text PRIMARY KEY,
	`buildingCode` text NOT NULL,
	`roomNumber` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`level` integer NOT NULL,
	`concept3dMapId` integer NOT NULL,
	`concept3dShape` text,
	`concept3dCategoryName` text NOT NULL,
	`concept3dLocationId` integer NOT NULL,
	`concept3dCategoryId` integer NOT NULL,
	`concept3dRoomId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courseSession_course_times_idx` ON `courseSession` (`courseId`,`endTime`,`startTime`);--> statement-breakpoint
CREATE UNIQUE INDEX `room_building_room_idx` ON `room` (`buildingCode`,`roomNumber`);
