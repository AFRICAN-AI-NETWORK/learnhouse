import { useOrg } from '@components/Contexts/OrgContext'
import React from 'react'

interface UseGetAIFeatures {
  feature: 'editor' | 'activity_ask' | 'course_ask' | 'global_ai_ask'
}

function useGetAIFeatures(props: UseGetAIFeatures) {
  const org = useOrg() as any

  const checkAvailableAIFeaturesOnOrg = React.useCallback(
    (feature: string) => {
      const config = org?.config?.config?.features.ai.enabled

      return config
    },
    [org]
  )

  const isEnabled = React.useMemo(() => {
    if (!org) {
      return false
    }

    return !!checkAvailableAIFeaturesOnOrg(props.feature)
  }, [org, props.feature, checkAvailableAIFeaturesOnOrg])

  return isEnabled
}

export default useGetAIFeatures
