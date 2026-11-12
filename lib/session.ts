import 'server-only'
import { headers } from 'next/headers'
import { auth } from './auth'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export function unauthorized() {
  return Response.json({ error: 'Please log in to continue.' }, { status: 401 })
}
