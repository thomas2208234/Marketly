import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Sign up — Marketly',
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect('/markets')
  return <AuthForm mode="sign-up" />
}
