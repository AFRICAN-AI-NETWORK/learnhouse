import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  'https://a77ff0ba31365bfeac7a359d0af7e454@o4511413599076352.ingest.de.sentry.io/4511413633089616'

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: true,
  tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'learnhouse@unknown',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data
    }
    return event
  },
  ignoreErrors: [
    'Failed to find Server Action',
    'older or newer deployment',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network Error$/,
    /^Load failed$/,
  ],
})
