import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'
import { nextAuthOptions } from 'app/auth/options'

const nextAuthHandler = NextAuth(nextAuthOptions)

// Wrap to guarantee a Response is always returned.
// next-auth v4 can return undefined in some code paths,
// which breaks Next.js 16's stricter Turbopack adapter.
async function handler(req: NextRequest, ctx: any) {
  const res = await nextAuthHandler(req, ctx)
  if (res instanceof Response) {
    return res
  }
  return new Response(null, { status: 200 })
}

export { handler as GET, handler as POST }
