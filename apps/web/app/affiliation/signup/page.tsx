import { Metadata } from 'next'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import AffiliationSignUpClient from './signup-client'
import { Suspense } from 'react'
import PageLoading from '@components/Objects/Loaders/PageLoading'

type MetadataProps = {
  params: Promise<{ orgslug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  params: MetadataProps
): Promise<Metadata> {
  const orgslug =
    ((await params.searchParams).orgslug as string) || 'african-ai'
  const org = await getOrganizationContextInfo(orgslug, {
    revalidate: 0,
    tags: ['organizations'],
  })

  return {
    title: 'Partner Signup' + ` — ${org?.name || 'African AI'}`,
    description:
      'Join the African AI partnership program and earn commissions.',
  }
}

const AffiliationSignUp = async (params: any) => {
  const orgslug =
    ((await params.searchParams).orgslug as string) || 'african-ai'
  const org = await getOrganizationContextInfo(orgslug, {
    revalidate: 0,
    tags: ['organizations'],
  })

  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <AffiliationSignUpClient org={org} />
      </Suspense>
    </>
  )
}

export default AffiliationSignUp
