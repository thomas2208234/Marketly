import { redirect } from 'next/navigation'
import { Landing } from '@/components/landing'
import { getSession } from '@/lib/session'

export default async function Page() {
  const session = await getSession()
  if (session?.user) redirect('/markets')
  return <Landing />
}
