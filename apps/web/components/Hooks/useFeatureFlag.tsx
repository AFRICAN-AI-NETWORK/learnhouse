import { useOrg } from '@components/Contexts/OrgContext'
import { useMemo } from 'react'

type FeatureType = {
  path: string[]
  defaultValue?: boolean
}

function useFeatureFlag(feature: FeatureType) {
  const org = useOrg() as any

  const isEnabled = useMemo(() => {
    if (org?.config?.config) {
      let currentValue = org.config.config

      // Traverse the path to get the feature flag value
      for (const key of feature.path) {
        if (currentValue && typeof currentValue === 'object') {
          currentValue = currentValue[key]
        } else {
          currentValue = feature.defaultValue || false
          break
        }
      }

      return !!currentValue
    }

    return !!feature.defaultValue
  }, [org?.config?.config, feature])

  return isEnabled
}

export default useFeatureFlag
