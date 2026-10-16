import { redirect } from 'next/navigation'

export default function PaymentsIndexPage() {
  redirect('/dash/payments/customers')
}
