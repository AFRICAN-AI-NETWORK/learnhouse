'use client'
import React from 'react'
import {
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  CheckCircle,
  XCircle,
  Globe,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { deactivateDiscountCode } from '@services/payments/discounts'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'

interface DiscountTableProps {
  discounts: any[]
  onEdit: (discount: any) => void
  onRefresh: () => void
}

const DiscountTable = ({
  discounts,
  onEdit,
  onRefresh,
}: DiscountTableProps) => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateDiscountCode(
        org.id,
        id,
        session.data?.tokens?.access_token
      )
      toast.success(
        t('payments.discount_deactivated') || 'Discount deactivated'
      )
      onRefresh()
    } catch {
      toast.error(t('common.error_request'))
    }
  }

  const getDiscountDisplay = (discount: any) => {
    const discountValue = discount.discount_value ?? discount.value

    if (discount.discount_type === 'percentage') {
      return (
        <div className="flex items-center gap-1 text-teal-600 font-bold">
          <span>{discountValue}%</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-blue-600 font-bold">
        <DollarSign size={14} />
        <span>{discountValue}</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('payments.code') || 'Code'}
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('common.type') || 'Type'}
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('payments.scope') || 'Scope'}
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('payments.usage') || 'Usage'}
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('common.status') || 'Status'}
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
              {t('common.actions') || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {discounts.map((discount) =>
            (() => {
              const currentUsage =
                discount.current_uses ?? discount.current_usage ?? 0
              const usagePercent = discount.max_uses
                ? Math.min(
                    Math.round((currentUsage / discount.max_uses) * 100),
                    100
                  )
                : 0

              return (
                <tr
                  key={discount.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded w-fit">
                        {discount.code}
                      </span>
                      {discount.description && (
                        <span className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">
                          {discount.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDiscountDisplay(discount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {discount.course_id ? (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <GraduationCap size={14} className="text-gray-400" />
                        <span>
                          {t('payments.course_restricted') || 'Course Specific'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-teal-600">
                        <Globe size={14} />
                        <span>{t('payments.global_code') || 'Global'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>
                          {currentUsage} / {discount.max_uses || '∞'}
                        </span>
                        <span>{usagePercent}%</span>
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${currentUsage >= (discount.max_uses || Infinity) ? 'bg-red-400' : 'bg-teal-500'}`}
                          style={{
                            width: `${usagePercent}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {discount.is_active ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle size={12} />
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-gray-400 flex items-center gap-1 w-fit"
                      >
                        <XCircle size={12} />
                        {t('common.inactive')}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(discount)}
                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={14} />
                      </Button>
                      <ConfirmationModal
                        confirmationButtonText={
                          t('common.deactivate') || 'Deactivate'
                        }
                        confirmationMessage={
                          t('payments.deactivate_discount_confirm') ||
                          'Are you sure you want to deactivate this discount code? It will no longer be applicable at checkout.'
                        }
                        dialogTitle={
                          t('payments.deactivate_discount_title') ||
                          `Deactivate ${discount.code}?`
                        }
                        dialogTrigger={
                          <button className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        }
                        functionToExecute={() => handleDeactivate(discount.id)}
                        status="warning"
                      />
                    </div>
                  </td>
                </tr>
              )
            })()
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DiscountTable
