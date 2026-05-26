import { useOrg } from '@components/Contexts/OrgContext'
import { useMemo } from 'react'

type FeatureType = {
  path: string[]
  defaultValue?: boolean
}

function getNestedValue(source: unknown, path: string[], index = 0): unknown {
  if (index >= path.length) {
    return source
  }

  if (!source || typeof source !== 'object') {
    return undefined
  }

  const key = path[index]

  if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
    return undefined
  }

  const descriptor = Object.getOwnPropertyDescriptor(source, key)
  if (!descriptor) {
    return undefined
  }

  return getNestedValue(descriptor.value, path, index + 1)
}

function useFeatureFlag(feature: FeatureType) {
  const org = useOrg() as any

  const isEnabled = useMemo(() => {
    if (org?.config?.config) {
      const currentValue = getNestedValue(org.config.config, feature.path)

      if (currentValue !== undefined) {
        return !!currentValue
      }

      return !!(feature.defaultValue ?? false)
    }

    return !!feature.defaultValue
  }, [org?.config?.config, feature])

  return isEnabled
}

export default useFeatureFlag
