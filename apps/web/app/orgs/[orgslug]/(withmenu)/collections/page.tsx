export const dynamic = 'force-dynamic'

import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { Metadata } from 'next'
import { nextAuthOptions } from 'app/auth/options'
import { getServerSession } from 'next-auth'
import { getOrgCollections } from '@services/courses/collections'
import { getOrgThumbnailMediaDirectory } from '@services/media/media'
import CollectionsClient from './CollectionsClient'
import { notFound } from 'next/navigation'

type MetadataProps = {
  params: Promise<{ orgslug: string; courseid: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: MetadataProps
): Promise<Metadata> {
  const params = await props.params
  try {
    // Get Org context information
    const org = await getOrganizationContextInfo(params.orgslug, {
      revalidate: 0,
      tags: ['organizations'],
    })

    // SEO
    return {
      title: `Collections — ${org.name}`,
      description: `Collections of courses from ${org.name}`,
      robots: {
        index: true,
        follow: true,
        nocache: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
        },
      },
      openGraph: {
        title: `Collections — ${org.name}`,
        description: `Collections of courses from ${org.name}`,
        type: 'website',
        images: [
          {
            url: getOrgThumbnailMediaDirectory(
              org?.org_uuid,
              org?.thumbnail_image
            ),
            width: 800,
            height: 600,
            alt: org.name,
          },
        ],
      },
    }
  } catch (error) {
    return {
      title: 'Collections',
    }
  }
}

const CollectionsPage = async (params: any) => {
  const session = await getServerSession(nextAuthOptions)
  const access_token = session?.tokens?.access_token
  const orgslug = (await params.params).orgslug
  let org_id
  let collections
  try {
    const org = await getOrganizationContextInfo(orgslug, {
      revalidate: 1800,
      tags: ['organizations'],
    })
    org_id = org.id
    collections = await getOrgCollections(
      org_id,
      access_token ? access_token : null,
      { revalidate: 0, tags: ['collections'] }
    )
  } catch (error) {
    notFound()
  }

  return (
    <CollectionsClient
      collections={collections}
      orgslug={orgslug}
      org_id={org_id}
    />
  )
}

export default CollectionsPage
