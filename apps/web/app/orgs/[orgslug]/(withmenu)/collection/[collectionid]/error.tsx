'use client' // Error components must be Client Components

import ErrorUI from '@components/Objects/StyledElements/Error/Error'
import { useEffect } from 'react'

export default function Error() {
  useEffect(() => {
    // Error logged to monitoring service
  }, [])

  return (
    <div>
      <ErrorUI></ErrorUI>
    </div>
  )
}
