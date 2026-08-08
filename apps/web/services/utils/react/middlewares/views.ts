import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { getConnectionStatus } from '@/lib/offline/connection'
import { CONNECTION_STATUS } from '@/lib/offline/constants'

export const denyAccessToUser = (error: any, router: AppRouterInstance) => {
  // While offline, a failed request means "could not reach the server", not
  // "access denied". Redirecting to /login here would strand an offline learner
  // on a login page they cannot possibly complete (plan Layer 5.30).
  if (getConnectionStatus() === CONNECTION_STATUS.OFFLINE) {
    return
  }

  // Only genuine authorisation responses redirect. An error without a numeric
  // status came from the transport layer, not the server.
  if (typeof error?.status !== 'number') {
    return
  }

  if (error.status === 401) {
    router.push('/login')
  }

  if (error.status === 403) {
    router.push('/login')
    // TODO : add a message to the user to tell him he is not allowed to access this page, route to /error
  }
}
