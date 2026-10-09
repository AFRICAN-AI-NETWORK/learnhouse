import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  errorHandling,
  getResponseMetadata,
} from '@services/utils/ts/requests'
import { AcademicCohort } from '@services/courses/schedule'

export type AcademicYear = {
  academic_year_uuid: string
  name: string
  region?: string | null
  start_date: string
  end_date: string
  is_active: boolean
  creation_date?: string
  update_date?: string
}

export type AcademicYearInput = {
  name: string
  region?: string | null
  start_date: string
  end_date: string
  is_active: boolean
}

export type AcademicCohortInput = {
  academic_year_uuid: string
  name: string
  start_date: string
  end_date: string
  enrollment_window_start?: string | null
  enrollment_window_end?: string | null
  status: 'upcoming' | 'active' | 'completed'
}

const api = () => getAPIUrl()

export async function getAcademicYears(
  access_token?: string
): Promise<AcademicYear[]> {
  const result = await fetch(
    `${api()}academic-years/`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function getActiveAcademicYear(
  access_token?: string
): Promise<AcademicYear> {
  const result = await fetch(
    `${api()}academic-years/active`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function createAcademicYear(
  body: AcademicYearInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-years/`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function updateAcademicYear(
  academic_year_uuid: string,
  body: Partial<AcademicYearInput>,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-years/${academic_year_uuid}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function deleteAcademicYear(
  academic_year_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-years/${academic_year_uuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getAcademicCohorts(
  academic_year_uuid: string,
  access_token?: string
): Promise<AcademicCohort[]> {
  const result = await fetch(
    `${api()}academic-cohorts/year/${academic_year_uuid}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function createAcademicCohort(
  body: AcademicCohortInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-cohorts/`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function updateAcademicCohort(
  academic_cohort_uuid: string,
  body: Partial<Omit<AcademicCohortInput, 'academic_year_uuid'>>,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-cohorts/${academic_cohort_uuid}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function deleteAcademicCohort(
  academic_cohort_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}academic-cohorts/${academic_cohort_uuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return await getResponseMetadata(result)
}
