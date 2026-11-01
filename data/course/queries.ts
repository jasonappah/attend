import { serverWhere, zql } from 'on-zero'

export const coursePermission = serverWhere('course', (q, auth) =>
  q.cmp('userId', auth?.id ?? ''),
)

export const courses = () =>
  zql.course.where(coursePermission).orderBy('courseName', 'asc').related('room', (q) => q.one())
