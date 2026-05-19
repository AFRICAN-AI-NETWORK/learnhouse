import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    'https://a77ff0ba31365bfeac7a359d0af7e454@o4511413599076352.ingest.de.sentry.io/4511413633089616',
  tracesSampleRate: 0.05,
  sendDefaultPii: true,
})
