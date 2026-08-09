import {
  getLEARNHOUSE_DOMAIN_VAL,
  getLEARNHOUSE_TOP_DOMAIN_VAL,
  getDefaultOrg,
  getUriWithOrg,
  isMultiOrgModeEnabled,
} from './services/config/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /fonts (inside /public)
     * 4. /umami Analytics
     * 5. /examples (inside /public)
     * 6. /icons (PWA icons - inside /public)
     * 7. /svg (inside /public)
     * 8. /activities_types (inside /public)
     * 9. /onboarding (inside /public)
     * 10. /assets (inside /public)
     * 11. /offline (the PWA offline fallback page — must not be org-scoped)
     * 12. Static files (sw.js, manifest.json, workbox, favicon, images)
     * 13. all root files inside /public (e.g. /favicon.ico)
     *
     * NOTE: any new subdirectory of /public — and any non-org-scoped route —
     * MUST be added here. Anything omitted is swallowed by org-slug rewriting and
     * 404s. Both `assets` and `offline` were missing, which made
     * `/assets/illustrations/*.png` and the offline fallback page unreachable.
     */
    '/((?!api|_next|fonts|umami|examples|icons|svg|activities_types|onboarding|data|landing|assets|offline|manifest\\.json|sw\\.js|workbox-.*\\.js|runtime-config\\.js|[\\w-]+\\.\\w+).*)',
    '/sitemap.xml',
    '/payments/stripe/connect/oauth',
  ],
}

export default async function proxy(req: NextRequest) {
  // Get initial data
  const hosting_mode = isMultiOrgModeEnabled() ? 'multi' : 'single'
  const default_org = getDefaultOrg()
  const { pathname, search } = req.nextUrl
  const fullhost = req.headers ? req.headers.get('host') : ''
  const cookie_orgslug = req.cookies.get('learnhouse_current_orgslug')?.value

  // Server Action POSTs are rewritten to 127.0.0.1 below, which is a real
  // network hop back into this same server. That proxied request re-enters
  // this middleware with the already-rewritten path; it must pass through
  // untouched, otherwise it gets rewritten again on every hop (growing the
  // path and x-forwarded-* headers each time) until the request dies with
  // 431 Request Header Fields Too Large.
  if (fullhost && fullhost.startsWith('127.0.0.1')) {
    return NextResponse.next()
  }

  // Helper to safely rewrite URLs, especially for Server Actions
  // Server Actions (POST requests) need special handling to avoid UND_ERR_HEADERS_TIMEOUT
  // caused by loopback network issues in Docker/Nixpacks containers
  const createRewriteUrl = (path: string) => {
    const rewriteUrl = new URL(path, req.url)
    if (req.method === 'POST') {
      rewriteUrl.hostname = '127.0.0.1'
      rewriteUrl.port = process.env.PORT || '3000'
      rewriteUrl.protocol = 'http:'
    }
    return rewriteUrl
  }
  // Out of orgslug paths & rewrite
  const standard_paths = ['/home']
  const auth_paths = [
    '/login',
    '/signup',
    '/reset',
    '/forgot',
    '/auth/waitlist/countdown',
  ]

  // Redirect legacy /auth/* routes to current auth routes
  if (pathname === '/auth/signin') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    if (!url.searchParams.has('orgslug')) {
      url.searchParams.set('orgslug', default_org as string)
    }
    return NextResponse.redirect(url)
  }

  if (pathname === '/auth/signup') {
    const url = req.nextUrl.clone()
    url.pathname = '/signup'
    if (!url.searchParams.has('orgslug')) {
      url.searchParams.set('orgslug', default_org as string)
    }
    return NextResponse.redirect(url)
  }

  if (pathname === '/auth/forgot-password') {
    const url = req.nextUrl.clone()
    url.pathname = '/forgot'
    if (!url.searchParams.has('orgslug')) {
      url.searchParams.set('orgslug', default_org as string)
    }
    return NextResponse.redirect(url)
  }

  if (standard_paths.includes(pathname)) {
    // Redirect to the same pathname with the original search params
    return NextResponse.rewrite(createRewriteUrl(`${pathname}${search}`))
  }

  if (auth_paths.includes(pathname)) {
    const targetPath = pathname.startsWith('/auth')
      ? pathname
      : `/auth${pathname}`

    // Parse the search params
    const searchParams = new URLSearchParams(search)
    let orgslug = searchParams.get('orgslug')

    if (!orgslug) {
      if (hosting_mode === 'multi') {
        const LEARNHOUSE_DOMAIN = getLEARNHOUSE_DOMAIN_VAL()
        orgslug = fullhost
          ? fullhost.replace(`.${LEARNHOUSE_DOMAIN}`, '')
          : (default_org as string)
      } else {
        orgslug = default_org as string
      }
      if (orgslug) {
        searchParams.set('orgslug', orgslug)
      }
    }

    const queryString = searchParams.toString()
    const finalSearch = queryString ? `?${queryString}` : ''

    const response = NextResponse.rewrite(
      createRewriteUrl(`${targetPath}${finalSearch}`)
    )

    if (orgslug) {
      const LEARNHOUSE_TOP_DOMAIN = getLEARNHOUSE_TOP_DOMAIN_VAL()
      response.cookies.set({
        name: 'learnhouse_current_orgslug',
        value: orgslug,
        domain:
          LEARNHOUSE_TOP_DOMAIN == 'localhost' ? '' : LEARNHOUSE_TOP_DOMAIN,
        path: '/',
      })
    }
    return response
  }

  // Dynamic Pages Editor
  if (pathname.match(/^\/course\/[^/]+\/activity\/[^/]+\/edit$/)) {
    return NextResponse.rewrite(createRewriteUrl(`/editor${pathname}`))
  }

  // Check if the request is for the Stripe callback URL
  if (req.nextUrl.pathname.startsWith('/payments/stripe/connect/oauth')) {
    const searchParams = req.nextUrl.searchParams
    const orgslug = searchParams.get('state')?.split('_')[0] // Assuming state parameter contains orgslug_randomstring

    // Construct the new URL with the required parameters
    const redirectUrl = new URL('/payments/stripe/connect/oauth', req.url)

    // Preserve all original search parameters
    searchParams.forEach((value, key) => {
      redirectUrl.searchParams.append(key, value)
    })

    // Add orgslug if available
    if (orgslug) {
      redirectUrl.searchParams.set('orgslug', orgslug)
    }

    return NextResponse.rewrite(redirectUrl)
  }

  // Health Check
  if (pathname.startsWith('/health')) {
    return NextResponse.rewrite(createRewriteUrl(`/api/health`))
  }

  // Join Landing Page (Public)
  if (pathname.startsWith('/join')) {
    return NextResponse.rewrite(createRewriteUrl(`${pathname}${search}`))
  }

  // Auth Redirects
  if (pathname == '/redirect_from_auth') {
    if (cookie_orgslug) {
      const searchParams = req.nextUrl.searchParams
      const queryString = searchParams.toString()
      const redirectPathname = '/'
      const redirectUrl = new URL(
        getUriWithOrg(cookie_orgslug, redirectPathname),
        req.url
      )

      if (queryString) {
        redirectUrl.search = queryString
      }
      return NextResponse.redirect(redirectUrl)
    } else {
      return 'Did not find the orgslug in the cookie'
    }
  }

  if (pathname.startsWith('/sitemap.xml')) {
    let orgslug: string

    const LEARNHOUSE_DOMAIN = getLEARNHOUSE_DOMAIN_VAL()
    if (hosting_mode === 'multi') {
      orgslug = fullhost
        ? fullhost.replace(`.${LEARNHOUSE_DOMAIN}`, '')
        : (default_org as string)
    } else {
      // Single hosting mode
      orgslug = default_org as string
    }

    const sitemapUrl = new URL(`/api/sitemap`, req.url)

    // Set the orgslug in a request header for the route handler
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('X-Sitemap-Orgslug', orgslug)

    const response = NextResponse.rewrite(sitemapUrl, {
      request: {
        headers: requestHeaders,
      },
    })

    return response
  }

  // Multi Organization Mode
  if (hosting_mode === 'multi') {
    // Get the organization slug from the URL
    const LEARNHOUSE_DOMAIN = getLEARNHOUSE_DOMAIN_VAL()
    const LEARNHOUSE_TOP_DOMAIN = getLEARNHOUSE_TOP_DOMAIN_VAL()
    const orgslug = fullhost
      ? fullhost.replace(`.${LEARNHOUSE_DOMAIN}`, '')
      : (default_org as string)
    const response = NextResponse.rewrite(
      createRewriteUrl(`/orgs/${orgslug}${pathname}${search}`)
    )

    // Set the cookie with the orgslug value
    response.cookies.set({
      name: 'learnhouse_current_orgslug',
      value: orgslug,
      domain: LEARNHOUSE_TOP_DOMAIN == 'localhost' ? '' : LEARNHOUSE_TOP_DOMAIN,
      path: '/',
    })

    return response
  }

  // Single Organization Mode
  if (hosting_mode === 'single') {
    // Get the default organization slug
    const LEARNHOUSE_TOP_DOMAIN = getLEARNHOUSE_TOP_DOMAIN_VAL()
    const orgslug = default_org as string
    const response = NextResponse.rewrite(
      createRewriteUrl(`/orgs/${orgslug}${pathname}${search}`)
    )

    if (pathname.startsWith('/ref/')) {
      return NextResponse.next()
    }

    // Set the cookie with the orgslug value
    response.cookies.set({
      name: 'learnhouse_current_orgslug',
      value: orgslug,
      domain: LEARNHOUSE_TOP_DOMAIN == 'localhost' ? '' : LEARNHOUSE_TOP_DOMAIN,
      path: '/',
    })

    return response
  }
}
