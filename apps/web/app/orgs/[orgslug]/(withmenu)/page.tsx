export const dynamic = 'force-dynamic'
import { Metadata } from 'next'
import { getOrgCourses } from '@services/courses/courses'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getOrgCollections } from '@services/courses/collections'
import { getServerSession } from 'next-auth'
import { nextAuthOptions } from 'app/auth/options'
import { getOrgThumbnailMediaDirectory } from '@services/media/media'
import LandingClassic from '@components/Landings/LandingClassic'
import LandingCustom from '@components/Landings/LandingCustom'

type MetadataProps = {
  params: Promise<{ orgslug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: MetadataProps
): Promise<Metadata> {
  const params = await props.params
  // Get Org context information
  const org = await getOrganizationContextInfo(params.orgslug, {
    revalidate: 0,
    tags: ['organizations'],
  })

  // SEO
  return {
    title: `Home — ${org.name}`,
    description: org.description,
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
      title: `Home — ${org.name}`,
      description: org.description,
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
}

const OrgHomePage = async (params: any) => {
  const orgslug = (await params.params).orgslug

  try {
    const session = await getServerSession(nextAuthOptions)
    const access_token = session?.tokens?.access_token

    // Fetch org info first (most critical)
    const org = await getOrganizationContextInfo(orgslug, {
      revalidate: 0,
      tags: ['organizations'],
    })

    // Fetch courses and collections in parallel with fallbacks
    const [courses, collections] = await Promise.allSettled([
      getOrgCourses(
        orgslug,
        { revalidate: 60, tags: ['courses'] },
        access_token ? access_token : null
      ),
      getOrgCollections(org.id, access_token ? access_token : null, {
        revalidate: 60,
        tags: ['courses'],
      }),
    ]).then(([coursesResult, collectionsResult]) => [
      coursesResult.status === 'fulfilled' ? coursesResult.value : [],
      collectionsResult.status === 'fulfilled' ? collectionsResult.value : [],
    ])

    const org_id = org.id

    // Check if custom landing is enabled
    const hasCustomLanding = org.config?.config?.landing?.enabled

    return (
      <div className="w-full">
        {hasCustomLanding ? (
          <LandingCustom
            landing={org.config.config.landing}
            orgslug={orgslug}
          />
        ) : (
          <LandingClassic
            courses={courses}
            collections={collections}
            orgslug={orgslug}
            org_id={org_id}
          />
        )}
      </div>
    )
  } catch (error) {
    // If org fetch fails, show friendly message
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            Service Temporarily Unavailable
          </h1>
          <p className="text-gray-600">
            We're experiencing technical difficulties. Please try again in a few
            moments.
          </p>
          <a
            href={`/orgs/${orgslug}`}
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </a>
        </div>
      </div>
    )
  }
}

export default OrgHomePage
