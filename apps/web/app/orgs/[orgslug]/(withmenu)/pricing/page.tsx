import PricingPageClient from './client'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
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
  const org = await getOrganizationContextInfo(params.orgslug, {
    revalidate: 1800,
    tags: ['organizations'],
  })

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
