import React, { useEffect, useState } from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { createProduct } from '@services/payments/products'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import toast from 'react-hot-toast'
import { mutate } from 'swr'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Label } from '@components/ui/label'
import currencyCodes from 'currency-codes'

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  description: Yup.string().required('Description is required'),
  amount: Yup.number()
    .min(0, 'Amount must be zero or greater')
    .required('Amount is required'),
  benefits: Yup.string(),
  currency: Yup.string().required('Currency is required'),
  product_type: Yup.string()
    .oneOf(['one_time', 'subscription'])
    .required('Product type is required'),
  interval: Yup.string().optional(),
  price_type: Yup.string()
    .oneOf(['fixed_price', 'customer_choice'])
    .required('Price type is required'),
  provider_product_id: Yup.string(),
})

interface ProductFormValues {
  name: string
  description: string
  product_type: 'one_time' | 'subscription'
  interval?: string
  price_type: 'fixed_price' | 'customer_choice'
  benefits: string
  amount: number
  currency: string
  provider_product_id: string
}

const CreateProductForm: React.FC<{ onSuccess: () => void }> = ({
  onSuccess,
}) => {
  const org = useOrg() as any
  const session = useLHSession() as any
  const [currencies, setCurrencies] = useState<
    { code: string; name: string }[]
  >([])

  useEffect(() => {
    const allCurrencies = currencyCodes.data.map((currency) => ({
      code: currency.code,
      name: `${currency.code} - ${currency.currency}`,
    }))
    setCurrencies(allCurrencies)
  }, [])

  const initialValues: ProductFormValues = {
    name: '',
    description: '',
    product_type: 'one_time',
    interval: 'monthly',
    price_type: 'fixed_price',
    benefits: '',
    amount: 1,
    currency: 'USD',
    provider_product_id: '',
  }

  const {
    register,
    handleSubmit: hookFormSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialValues,
  })

  const formValues = watch()

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const res = await createProduct(
        org.id,
        values,
        session.data?.tokens?.access_token
      )
      if (res.success) {
        toast.success('Product created successfully')
        mutate([
          `/payments/${org.id}/products`,
          session.data?.tokens?.access_token,
        ])
        reset()
        onSuccess()
      } else {
        toast.error(res.data?.detail || 'Failed to create product')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating product:', error)
      toast.error('An error occurred while creating the product')
    }
  }

  return (
    <form onSubmit={hookFormSubmit(onSubmit)} className="space-y-4">
      <div className="px-1.5 py-2 flex-col space-y-3">
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input {...register('name')} placeholder="Product Name" />
          {errors.name && (
            <div className="text-red-500 text-sm mt-1">
              {errors.name.message}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            {...register('description')}
            placeholder="Product Description"
          />
          {errors.description && (
            <div className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="product_type">Product Type</Label>
          <Select
            value={formValues.product_type}
            onValueChange={(value) => setValue('product_type', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One Time</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
            </SelectContent>
          </Select>
          {errors.product_type && (
            <div className="text-red-500 text-sm mt-1">
              {errors.product_type.message}
            </div>
          )}
        </div>

        {formValues.product_type === 'subscription' && (
          <div>
            <Label htmlFor="interval">Billing Interval</Label>
            <Select
              value={formValues.interval || 'monthly'}
              onValueChange={(value) => setValue('interval', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Billing Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {errors.interval && (
              <div className="text-red-500 text-sm mt-1">
                {errors.interval.message}
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="price_type">Price Type</Label>
          <Select
            value={formValues.price_type}
            onValueChange={(value) => setValue('price_type', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Price Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_price">Fixed Price</SelectItem>
              {formValues.product_type !== 'subscription' && (
                <SelectItem value="customer_choice">Customer Choice</SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.price_type && (
            <div className="text-red-500 text-sm mt-1">
              {errors.price_type.message}
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <div className="grow">
            <Label htmlFor="amount">
              {formValues.price_type === 'fixed_price'
                ? 'Price'
                : 'Minimum Amount'}
            </Label>
            <Input
              {...register('amount')}
              type="number"
              step="any"
              placeholder={
                formValues.price_type === 'fixed_price'
                  ? 'Price'
                  : 'Minimum Amount'
              }
            />
            {errors.amount && (
              <div className="text-red-500 text-sm mt-1">
                {errors.amount.message}
              </div>
            )}
          </div>
          <div className="w-1/3">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formValues.currency}
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <div className="text-red-500 text-sm mt-1">
                {errors.currency.message}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="provider_product_id">
            Provider Plan ID (Optional)
          </Label>
          <Input
            {...register('provider_product_id')}
            placeholder="E.g. Flutterwave Plan ID"
          />
          {errors.provider_product_id && (
            <div className="text-red-500 text-sm mt-1">
              {errors.provider_product_id.message}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="benefits">Benefits</Label>
          <Textarea {...register('benefits')} placeholder="Product Benefits" />
          {errors.benefits && (
            <div className="text-red-500 text-sm mt-1">
              {errors.benefits.message}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Product'}
        </Button>
      </div>
    </form>
  )
}

export default CreateProductForm
