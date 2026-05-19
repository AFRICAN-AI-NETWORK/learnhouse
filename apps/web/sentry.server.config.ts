import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? 'https://55e9eb74c6a3d96bd899194a4c5184b9@o4511413599076352.ingest.de.sentry.io/4511413627584592',
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'learnhouse@unknown',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  sendDefaultPii: true,
})
