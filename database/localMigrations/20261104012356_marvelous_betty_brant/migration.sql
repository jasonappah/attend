CREATE TABLE `backgroundTaskRun` (
	`id` text PRIMARY KEY,
	`task` text NOT NULL,
	`ranAt` integer NOT NULL,
	`batteryLevel` integer,
	`batteryState` text,
	`lowPowerMode` integer,
	`deviceModel` text,
	`deviceSystemName` text,
	`deviceSystemVersion` text,
	`isSimulator` integer
);
