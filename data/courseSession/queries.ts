import { serverWhere, zql } from 'on-zero'

export const courseSessionPermission = serverWhere('courseSession', (q, auth) =>
  q.exists('course', (course) => course.where('userId', auth?.id ?? ''))
)

export const sessions = () =>
  zql.courseSession
    .where(courseSessionPermission)
    .orderBy('startTime', 'asc')
    .related('course', (course) => course.one().related('room', (room) => room.one()))
