'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    // console.error(error)
  }, [error])

  return (
    <div className="container mx-auto py-8">
      <div className="bg-white rounded-xl nice-shadow p-6">
        <h2 className="text-red-600 font-semibold mb-4">
          Error loading user profile
        </h2>
        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
