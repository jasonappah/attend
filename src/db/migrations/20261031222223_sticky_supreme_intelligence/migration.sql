ALTER TABLE "course" DROP CONSTRAINT "course_calendarId_calendar_id_fk";
--> statement-breakpoint
ALTER TABLE "course" ALTER COLUMN "calendarId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_calendarId_calendar_id_fk" FOREIGN KEY ("calendarId") REFERENCES "public"."calendar"("id") ON DELETE set null ON UPDATE no action;