export const dynamic = 'force-dynamic'
import { Metadata } from 'next'
import { getOrgCourses } from '@services/courses/courses'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getOrgCollections } from '@services/courses/collections'
import { getServerSession } from 'next-auth'
import { nextAuthOptions } from 'app/auth/options'
import { getOrgThumbnailMediaDirectory } from '@services/media/media'
import LandingPremium from '@components/Landings/LandingPremium'
import LandingClassic from '@components/Landings/LandingClassic'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { getUriWithOrg } from '@services/config/config'

type MetadataProps = {
  params: Promise<{ orgslug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type OrgHomePageProps = {
  params: Promise<{ orgslug: string }>
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
    const fallbackDescription =
      'African AI Network Academy (AINA) is a learning management system offering 12-week certification courses in AI Automation and Generative AI for African professionals.'
    const seoDescription =
      org.description && org.description.length > 20
        ? org.description
        : fallbackDescription

    return {
      title: `Home — ${org.name}`,
      description: seoDescription,
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
        description: seoDescription,
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
      title: 'Home',
    }
  }
}

const OrgHomePage = async (props: OrgHomePageProps) => {
  const orgslug = (await props.params).orgslug
  const searchParams = await props.searchParams
  const landingParam = searchParams?.landing
  const shouldForcePremiumLanding =
    typeof landingParam === 'string' && landingParam === 'premium'

  try {
    const session = await getServerSession(nextAuthOptions)
    const access_token = session?.tokens?.access_token

    // Fetch org info first (most critical)
    const org = await getOrganizationContextInfo(orgslug, {
      revalidate: 0,
      tags: ['organizations'],
    })

    // Handle partner redirection
    if (session && Array.isArray(session.roles) && org?.id) {
      const orgRoles = session.roles.filter((r: any) => r.org?.id === org.id)
      let isPartner = false
      let isAdmin = false

      orgRoles.forEach((r: any) => {
        if (r.role?.role_uuid === 'partner_role') {
          isPartner = true
        }
        if (
          r.role?.id === 1 ||
          r.role?.id === 2 ||
          r.role?.rights?.organizations?.action_update
        ) {
          isAdmin = true
        }
      })

      if (isPartner && !isAdmin) {
        redirect(getUriWithOrg(orgslug, '/dash/referrals'))
      }
    }

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

    // If internal user (logged in), show the classic LMS view (collections and courses)
    // If guest, show the premium landing page
    if (session && !shouldForcePremiumLanding) {
      return (
        <div className="w-full">
          <LandingClassic
            courses={courses}
            collections={collections}
            orgslug={orgslug}
            org_id={org.id}
          />
        </div>
      )
    }

    return (
      <div className="w-full">
        <LandingPremium
          org={org}
          courses={courses}
          collections={collections}
          orgslug={orgslug}
        />
      </div>
    )
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

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
