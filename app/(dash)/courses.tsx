import { useQuery } from '@rocicorp/zero/react'
import { Card, H2, Paragraph } from 'tamagui'
import { queries } from '~/zero/queries'
import type { Course } from '~/zero/schema.gen'

export default function ClassOverviewPage() {
  const [courses, coursesQuery] = useQuery(queries.courses())
  return (
    <>
      <H2>Courses</H2>
      {coursesQuery.type === 'error' && <Paragraph>Failed to get the courses.</Paragraph>}
      {courses.map(data => {
        return <CourseCard data={data} key={data.id} />
      })}
    </>
  )
}


function CourseCard({ data }: { data: Course }) {
  return (
    <Card>
      <Card.Header>
        {data.courseName}
      </Card.Header>
    </Card>
  )
}