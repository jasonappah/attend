import { serverWhere, zql } from 'on-zero'

export const calendarPermission = serverWhere('calendar', (q, auth) =>
  q.cmp('userId', auth?.id ?? '')
)

export const calendars = () => zql.calendar.where(calendarPermission)
