import { useOrg } from '@components/Contexts/OrgContext'

interface UseGetAIFeatures {
  feature: 'editor' | 'activity_ask' | 'course_ask' | 'global_ai_ask'
}

function useGetAIFeatures(props: UseGetAIFeatures) {
  const org = useOrg() as any
  void props.feature
  return Boolean(org?.config?.config?.features?.ai?.enabled)
}

export default useGetAIFeatures
