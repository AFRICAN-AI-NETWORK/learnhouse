import CalendarClient from './calendar'

type CalendarPageProps = {
  params: Promise<{ orgslug: string }>
}

const CalendarPage = async (props: CalendarPageProps) => {
  const orgslug = (await props.params).orgslug

  return <CalendarClient orgslug={orgslug} />
}

export default CalendarPage
