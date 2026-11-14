import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Log in — Marketly',
}

export default async function SignInPage() {
  const session = await getSession()
  const isGuest = Boolean(session?.user.isAnonymous)
  if (session?.user && !isGuest) redirect('/markets')
  return <AuthForm mode="sign-in" guestActive={isGuest} />
}
