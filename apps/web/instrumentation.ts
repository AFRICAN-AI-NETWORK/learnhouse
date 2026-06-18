export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load server-side Sentry configuration
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Load edge runtime Sentry configuration
    await import('./sentry.edge.config')
  }
}
