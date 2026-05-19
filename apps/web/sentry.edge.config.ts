import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? 'https://55e9eb74c6a3d96bd899194a4c5184b9@o4511413599076352.ingest.de.sentry.io/4511413627584592',
  tracesSampleRate: 0.05,
  sendDefaultPii: true,
})
