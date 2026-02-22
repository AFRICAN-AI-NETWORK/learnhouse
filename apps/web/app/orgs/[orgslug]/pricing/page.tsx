import PricingPageClient from './client'
import { getOrgFromSlug } from '@services/orgs/orgs'
import { getPublicProducts } from '@services/payments/public-products'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Pricing - Programs & Packages',
  description:
    'Explore our educational packages, specializations, and bundles.',
}

export default async function PricingPage(props: {
  params: Promise<{ orgslug: string }>
}) {
  const params = await props.params
  const org = await getOrgFromSlug(params.orgslug)

  if (!org) {
    return notFound()
  }

  let products = []
  try {
    products = await getPublicProducts(org.id)
  } catch (error) {
    // Silently fail, products stays empty
  }

  return (
    <PricingPageClient orgslug={params.orgslug} initialProducts={products} />
  )
}
