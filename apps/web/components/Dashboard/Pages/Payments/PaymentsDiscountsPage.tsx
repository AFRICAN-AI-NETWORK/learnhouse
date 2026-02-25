'use client'
import React, { useState } from 'react'
import { Plus, Ticket, Search, Filter } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { listDiscountCodes } from '@services/payments/discounts'
import DiscountTable from './SubComponents/DiscountTable'
import DiscountFormModal from './SubComponents/DiscountFormModal'
import { useTranslation } from 'react-i18next'

const PaymentsDiscountsPage = () => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: discounts,
    mutate,
    isLoading,
  } = useSWR(
    () =>
      org && session
        ? [
            `/payments/${org.id}/discount-codes`,
            session.data?.tokens?.access_token,
          ]
        : null,
    ([, token]) => listDiscountCodes(org.id, token)
  )

  const discountsData = (discounts as any)?.data
  const discountList = Array.isArray(discountsData)
    ? discountsData
    : Array.isArray(discountsData?.data)
      ? discountsData.data
      : []

  const filteredDiscounts = discountList.filter((discount: any) => {
    const code = String(discount?.code ?? '').toLowerCase()
    const description = String(discount?.description ?? '').toLowerCase()
    const query = searchQuery.toLowerCase()

    return code.includes(query) || description.includes(query)
  })

  const handleCreate = () => {
    setSelectedDiscount(null)
    setIsModalOpen(true)
  }

  const handleEdit = (discount: any) => {
    setSelectedDiscount(discount)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder={
              t('payments.search_discounts') || 'Search discount codes...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            {t('common.filter')}
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            {t('payments.create_discount')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : filteredDiscounts && filteredDiscounts.length > 0 ? (
          <DiscountTable
            discounts={filteredDiscounts}
            onEdit={handleEdit}
            onRefresh={mutate}
          />
        ) : (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-gray-400">
            <div className="bg-gray-50 p-4 rounded-full">
              <Ticket size={48} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600">
                {t('payments.no_discounts_found') || 'No discount codes found'}
              </p>
              <p className="text-sm">
                {t('payments.no_discounts_description') ||
                  'Create your first discount code to start promoting your courses.'}
              </p>
            </div>
            <Button variant="outline" onClick={handleCreate} className="mt-2">
              <Plus size={16} className="mr-2" />
              {t('payments.create_discount')}
            </Button>
          </div>
        )}
      </div>

      <DiscountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        discount={selectedDiscount}
        onSuccess={() => {
          setIsModalOpen(false)
          mutate()
        }}
      />
    </div>
  )
}

export default PaymentsDiscountsPage
