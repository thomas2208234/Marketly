import 'server-only'
import { headers } from 'next/headers'
import { auth } from './auth'

// A failed session lookup (e.g. a database hiccup) must not crash the page;
// treat it as signed out so visitors still reach the landing and login pages.
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch (error) {
    console.error('[auth] session lookup failed', error)
    return null
  }
}

export function unauthorized() {
  return Response.json({ error: 'Please log in to continue.' }, { status: 401 })
}
