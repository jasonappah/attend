ALTER TABLE `backgroundTaskRun` ADD COLUMN `batteryLevel` integer;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `batteryState` text;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `lowPowerMode` integer;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `deviceModel` text;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `deviceSystemName` text;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `deviceSystemVersion` text;
ALTER TABLE `backgroundTaskRun` ADD COLUMN `isSimulator` integer;
