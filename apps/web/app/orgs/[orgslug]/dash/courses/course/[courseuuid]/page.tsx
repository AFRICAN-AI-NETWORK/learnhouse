import { redirect } from 'next/navigation'

export default async function CourseUuidIndexPage(props: {
  params: Promise<{ orgslug: string; courseuuid: string }>
}) {
  const params = await props.params
  redirect(`/dash/courses/course/${params.courseuuid}/general`)
}
