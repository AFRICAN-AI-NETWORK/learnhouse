'use client'
import React from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  createDiscountCode,
  updateDiscountCode,
} from '@services/payments/discounts'
import { getOwnedCourses } from '@services/payments/payments'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Switch } from '@components/ui/switch'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { Ticket, Percent, DollarSign, Info } from 'lucide-react'

interface DiscountFormModalProps {
  isOpen: boolean
  onClose: () => void
  discount?: any
  onSuccess: () => void
}

const validationSchema = Yup.object().shape({
  code: Yup.string()
    .required('Code is required')
    .matches(
      /^[A-Z0-9_-]+$/,
      'Code can only contain uppercase letters, numbers, underscores, and hyphens'
    ),
  discount_type: Yup.string()
    .oneOf(['percentage', 'fixed'])
    .required('Type is required'),
  value: Yup.number()
    .required('Value is required')
    .min(0.01, 'Value must be greater than 0')
    .when('discount_type', {
      is: 'percentage',
      then: (schema) => schema.max(100, 'Percentage cannot exceed 100'),
    }),
  max_uses: Yup.number().min(1, 'Max uses must be at least 1').nullable(),
  valid_from: Yup.date().nullable(),
  valid_until: Yup.date()
    .nullable()
    .min(Yup.ref('valid_from'), 'End date must be after start date'),
  is_active: Yup.boolean(),
  course_id: Yup.number().nullable(),
  is_global: Yup.boolean(),
})

const DiscountFormModal = ({
  isOpen,
  onClose,
  discount,
  onSuccess,
}: DiscountFormModalProps) => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any

  const { data: ownedCourses } = useSWR(
    () =>
      org && session
        ? [
            `/payments/${org.id}/courses/owned`,
            session.data?.tokens?.access_token,
          ]
        : null,
    ([, token]) => getOwnedCourses(org.id, token)
  )

  const initialValues = {
    code: discount?.code || '',
    description: discount?.description || '',
    discount_type: discount?.discount_type || 'percentage',
    value: discount?.value || 0,
    max_uses: discount?.max_uses || null,
    valid_from: discount?.valid_from
      ? new Date(discount.valid_from).toISOString().split('T')[0]
      : '',
    valid_until: discount?.valid_until
      ? new Date(discount.valid_until).toISOString().split('T')[0]
      : '',
    is_active: discount ? discount.is_active : true,
    course_id: discount?.course_id || null,
    is_global: !discount?.course_id,
  }

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const data = {
        ...values,
        course_id: values.is_global ? null : values.course_id,
        valid_from: values.valid_from
          ? new Date(values.valid_from).toISOString()
          : null,
        valid_until: values.valid_until
          ? new Date(values.valid_until).toISOString()
          : null,
      }

      delete data.is_global

      if (discount) {
        await updateDiscountCode(
          org.id,
          discount.id,
          data,
          session.data?.tokens?.access_token
        )
        toast.success(
          t('payments.discount_updated') || 'Discount updated successfully'
        )
      } else {
        await createDiscountCode(
          org.id,
          data,
          session.data?.tokens?.access_token
        )
        toast.success(
          t('payments.discount_created') || 'Discount created successfully'
        )
      }
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || t('common.error_request'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isDialogOpen={isOpen}
      onOpenChange={onClose}
      dialogTitle={
        discount
          ? t('payments.edit_discount') || 'Edit Discount Code'
          : t('payments.create_discount') || 'Create Discount Code'
      }
      dialogDescription={
        t('payments.discount_form_description') ||
        'Set up your discount rules here. Codes can be restricted to specific courses.'
      }
      dialogContent={
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="code">{t('payments.code') || 'Code'}</Label>
                  <div className="relative mt-1">
                    <Ticket
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <Field
                      name="code"
                      as={Input}
                      placeholder="SUMMER2026"
                      className="pl-10 uppercase font-mono"
                    />
                  </div>
                  <ErrorMessage
                    name="code"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">
                    {t('common.description') || 'Description'}
                  </Label>
                  <Field
                    name="description"
                    as={Textarea}
                    placeholder="E.g. Summer sale for all courses"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="discount_type">
                    {t('common.type') || 'Discount Type'}
                  </Label>
                  <Select
                    value={values.discount_type}
                    onValueChange={(v) => setFieldValue('discount_type', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue
                        placeholder={t('payments.select_type') || 'Select type'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent size={14} />
                          <span>
                            {t('payments.percentage') || 'Percentage'}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} />
                          <span>
                            {t('payments.fixed_amount') || 'Fixed Amount'}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value">{t('common.value') || 'Value'}</Label>
                  <Field
                    name="value"
                    as={Input}
                    type="number"
                    step="0.01"
                    placeholder="10"
                    className="mt-1"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 px-1">
                    {values.discount_type === 'percentage'
                      ? t('payments.value_percentage_hint') ||
                        'Value as a percentage (e.g., 10 for 10%)'
                      : t('payments.value_fixed_hint') ||
                        "Value in your organization's currency"}
                  </p>
                  <ErrorMessage
                    name="value"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                <div className="col-span-2 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">
                        {t('payments.global_code') || 'Global Discount'}
                      </Label>
                      <p className="text-xs text-gray-500">
                        {t('payments.global_code_description') ||
                          'Applies to all products in the organization (Admins only)'}
                      </p>
                    </div>
                    <Switch
                      checked={values.is_global}
                      onCheckedChange={(v) => {
                        setFieldValue('is_global', v)
                        if (v) setFieldValue('course_id', null)
                      }}
                    />
                  </div>

                  {!values.is_global && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="course_id" className="text-xs">
                        {t('courses.select_course') || 'Select Course'}
                      </Label>
                      <Select
                        value={values.course_id?.toString() || ''}
                        onValueChange={(v) =>
                          setFieldValue('course_id', parseInt(v))
                        }
                      >
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue
                            placeholder={
                              t('payments.select_course') || 'Select a course'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {ownedCourses?.map((course: any) => (
                            <SelectItem
                              key={course.id}
                              value={course.id.toString()}
                            >
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ErrorMessage
                        name="course_id"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="max_uses">
                    {t('payments.max_uses') || 'Max Uses'}
                  </Label>
                  <Field
                    name="max_uses"
                    as={Input}
                    type="number"
                    placeholder={t('payments.unlimited') || 'Unlimited'}
                    className="mt-1"
                  />
                  <ErrorMessage
                    name="max_uses"
                    component="div"
                    className="text-red-500 text-xs mt-1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-8">
                  <Switch
                    checked={values.is_active}
                    onCheckedChange={(v) => setFieldValue('is_active', v)}
                  />
                  <Label>{t('common.active') || 'Active'}</Label>
                </div>

                <div>
                  <Label htmlFor="valid_from">
                    {t('payments.valid_from') || 'Valid From'}
                  </Label>
                  <Field
                    name="valid_from"
                    as={Input}
                    type="date"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="valid_until">
                    {t('payments.valid_until') || 'Valid Until'}
                  </Label>
                  <Field
                    name="valid_until"
                    as={Input}
                    type="date"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50/50 text-blue-700 rounded-lg text-xs">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>
                  {t('payments.discount_admin_note') ||
                    'Instructors can only create course-specific discounts for courses they own. Global discounts require organization admin permissions.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      }
    />
  )
}

export default DiscountFormModal
