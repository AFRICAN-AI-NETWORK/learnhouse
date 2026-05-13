import * as Sentry from '@sentry/nextjs'

export const sentryAuthEvents = {
  async signIn({ user }: { user: { id?: string } }) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'User signed in',
      level: 'info',
      data: { userId: user.id },
    })
  },
  async signOut() {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'User signed out',
      level: 'info',
    })
  },
}
