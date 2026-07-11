'use client'
import React, { useState, useEffect } from 'react'
import currencyCodes from 'currency-codes'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR, { mutate } from 'swr'
import {
  getProducts,
  updateProduct,
  archiveProduct,
} from '@services/payments/products'
import {
  Plus,
  Pencil,
  Info,
  RefreshCcw,
  SquareCheck,
  ChevronDown,
  ChevronUp,
  Archive,
} from 'lucide-react'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
import toast from 'react-hot-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Label } from '@components/ui/label'
import { Badge } from '@components/ui/badge'
import { getPaymentConfigs } from '@services/payments/payments'
import ProductLinkedCourses from './SubComponents/ProductLinkedCourses'
import { usePaymentsEnabled } from '@hooks/usePaymentsEnabled'
import UnconfiguredPaymentsDisclaimer from '@components/Pages/Payments/UnconfiguredPaymentsDisclaimer'
import CreateProductForm from './SubComponents/CreateProductForm'

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  description: Yup.string().required('Description is required'),
  amount: Yup.number()
    .min(0, 'Amount must be positive')
    .required('Amount is required'),
  benefits: Yup.string(),
  currency: Yup.string().required('Currency is required'),
  product_type: Yup.string().nullable(),
})

function PaymentsProductPage() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<{
    [key: string]: boolean
  }>({})
  const { isEnabled, isLoading } = usePaymentsEnabled()

  const { data: products, error } = useSWR(
    () =>
      org && session
        ? [`/payments/${org.id}/products`, session.data?.tokens?.access_token]
        : null,
    ([, token]) => getProducts(org.id, token)
  )

  const { data: paymentConfigs } = useSWR(
    () =>
      org && session
        ? [`/payments/${org.id}/config`, session.data?.tokens?.access_token]
        : null,
    ([, token]) => getPaymentConfigs(org.id, token)
  )

  const flutterwaveConfig = paymentConfigs?.find(
    (config: any) => config.provider === 'flutterwave'
  )
  const isFlutterwaveEnabled = !!flutterwaveConfig

  const handleArchiveProduct = async (productId: string) => {
    const res = await archiveProduct(
      org.id,
      productId,
      session.data?.tokens?.access_token
    )
    mutate([`/payments/${org.id}/products`, session.data?.tokens?.access_token])
    if (res.status === 200) {
      toast.success('Product archived successfully')
    } else {
      toast.error(res.data.detail)
    }
  }

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  if (!isEnabled && !isLoading) {
    return <UnconfiguredPaymentsDisclaimer />
  }

  if (error) return <div>Failed to load products</div>
  if (!products) return <div>Loading...</div>

  return (
    <div className="h-full w-full bg-[#f8f8f8]">
      <div className="pl-10 pr-10 mx-auto">
        <Modal
          isDialogOpen={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          dialogTitle="Create New Product"
          dialogDescription="Add a new product to your organization"
          dialogContent={
            <CreateProductForm onSuccess={() => setIsCreateModalOpen(false)} />
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.data.map((product: any) => (
            <div
              key={product.id}
              className="bg-white p-4 rounded-lg nice-shadow flex flex-col h-full"
            >
              {editingProductId === product.id ? (
                <EditProductForm
                  product={product}
                  onSuccess={() => setEditingProductId(null)}
                  onCancel={() => setEditingProductId(null)}
                />
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col space-y-1 items-start">
                      <Badge
                        className="w-fit flex items-center space-x-2"
                        variant="outline"
                      >
                        {product.product_type === 'subscription' ? (
                          <RefreshCcw size={12} />
                        ) : (
                          <SquareCheck size={12} />
                        )}
                        <span className="text-sm">
                          {product.product_type === 'subscription'
                            ? 'Subscription'
                            : 'One-time payment'}
                        </span>
                      </Badge>
                      <h3 className="font-bold text-lg">{product.name}</h3>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingProductId(product.id)}
                        className={`text-blue-500 hover:text-blue-700 ${isFlutterwaveEnabled ? '' : 'opacity-50 cursor-not-allowed'}`}
                        disabled={!isFlutterwaveEnabled}
                      >
                        <Pencil size={16} />
                      </button>
                      <ConfirmationModal
                        confirmationButtonText="Archive Product"
                        confirmationMessage="Are you sure you want to archive this product?"
                        dialogTitle={`Archive ${product.name}?`}
                        dialogTrigger={
                          <button className="text-red-500 hover:text-red-700">
                            <Archive size={16} />
                          </button>
                        }
                        functionToExecute={() =>
                          handleArchiveProduct(product.id)
                        }
                        status="warning"
                      />
                    </div>
                  </div>
                  <div className="grow overflow-hidden">
                    <div
                      className={`transition-all duration-300 ease-in-out ${expandedProducts[product.id] ? 'max-h-[1000px]' : 'max-h-24'} overflow-hidden`}
                    >
                      <p className="text-gray-600">{product.description}</p>
                      {product.benefits && (
                        <div className="mt-2">
                          <h4 className="font-semibold text-sm">Benefits:</h4>
                          <p className="text-sm text-gray-600">
                            {product.benefits}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => toggleProductExpansion(product.id)}
                      className="text-slate-500 hover:text-slate-700 text-sm flex items-center"
                    >
                      {expandedProducts[product.id] ? (
                        <>
                          <ChevronUp size={16} />
                          <span>Show less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} />
                          <span>Show more</span>
                        </>
                      )}
                    </button>
                  </div>
                  <ProductLinkedCourses productId={product.id} />
                  <div className="mt-2 flex items-center justify-between bg-gray-100 rounded-md p-2">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-semibold text-lg">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: product.currency,
                      }).format(product.amount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {products.data.length === 0 && (
          <div className="flex mx-auto space-x-2 font-semibold mt-3 text-gray-600 items-center">
            <Info size={20} />
            <p>No products available. Create a new product to get started.</p>
          </div>
        )}

        <div className="flex justify-center items-center py-10">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className={`mb-4 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-linear-to-bl text-white font-medium from-gray-700 to-gray-900 border border-gray-600 shadow-gray-900/20 nice-shadow transition duration-300 ${
              isFlutterwaveEnabled
                ? 'hover:from-gray-600 hover:to-gray-800'
                : 'opacity-50 cursor-not-allowed'
            }`}
            disabled={!isFlutterwaveEnabled}
          >
            <Plus size={18} />
            <span className="text-sm font-bold">Create New Product</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const EditProductForm = ({
  product,
  onSuccess,
  onCancel,
}: {
  product: any
  onSuccess: () => void
  onCancel: () => void
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

  const initialValues = {
    name: product.name,
    description: product.description,
    amount: product.amount,
    benefits: product.benefits || '',
    currency: product.currency || '',
    product_type: product.product_type,
  }

  const {
    register,
    handleSubmit: hookFormSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialValues,
  })

  const formValues = watch()

  const onSubmit = async (values: any) => {
    try {
      await updateProduct(
        org.id,
        product.id,
        values,
        session.data?.tokens?.access_token
      )
      mutate([
        `/payments/${org.id}/products`,
        session.data?.tokens?.access_token,
      ])
      onSuccess()
      toast.success('Product updated successfully')
    } catch {
      toast.error('Failed to update product')
    }
  }

  return (
        <form onSubmit={hookFormSubmit(onSubmit)} className="space-y-4">
          <div className="px-1.5 py-2 flex-col space-y-3">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input {...register('name')} placeholder="Product Name" />
              {errors.name && (
                <div className="text-red-500 text-sm mt-1">{errors.name.message as string}</div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea {...register('description')} placeholder="Product Description" />
              {errors.description && (
                <div className="text-red-500 text-sm mt-1">{errors.description.message as string}</div>
              )}
            </div>

            <div className="flex space-x-2">
              <div className="grow">
                <Label htmlFor="amount">Price</Label>
                <Input {...register('amount')} type="number" step="any" placeholder="Price" />
                {errors.amount && (
                  <div className="text-red-500 text-sm mt-1">{errors.amount.message as string}</div>
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
                  <div className="text-red-500 text-sm mt-1">{errors.currency.message as string}</div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="benefits">Benefits</Label>
              <Textarea {...register('benefits')} placeholder="Product Benefits" />
              {errors.benefits && (
                <div className="text-red-500 text-sm mt-1">{errors.benefits.message as string}</div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
  )
}

export default PaymentsProductPage
