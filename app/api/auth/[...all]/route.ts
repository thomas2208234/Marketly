import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const handlers = toNextJsHandler(auth)

async function logFailures(request: Request, handler: (request: Request) => Promise<Response>) {
  let response: Response
  try {
    response = await handler(request)
  } catch (error) {
    console.error('[auth] handler threw', {
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(
      { code: 'SERVER_ERROR', message: 'Marketly’s server hit an error. Please try again in a moment.' },
      { status: 500 },
    )
  }

  if (response.status >= 400) {
    let reason = ''
    try {
      const body = (await response.clone().json()) as { code?: string; message?: string }
      reason = [body.code, body.message].filter(Boolean).join(': ')
    } catch {}
    // Never log the request body: it contains the password.
    console.error('[auth] request failed', {
      path: new URL(request.url).pathname,
      status: response.status,
      reason,
      origin: request.headers.get('origin'),
      host: request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
    })
  }
  return response
}

export const GET = (request: Request) => logFailures(request, handlers.GET)
export const POST = (request: Request) => logFailures(request, handlers.POST)
