// Keep in sync with PUBLIC_BASE_PATH in shared/index.ts
const PREFIX = '/wellntel/map-services-and-meta'

export default {
  /**
   * Path adapter only. /refundone and every other path stay on Pages.
   * This Worker is routed solely at PREFIX and PREFIX/*.
   */
  async fetch(request, env) {
    const origin = String(env.ORIGIN ?? '').replace(/\/$/, '')
    if (!origin) {
      return new Response('ORIGIN is not configured', { status: 500 })
    }

    const url = new URL(request.url)

    if (url.pathname === PREFIX) {
      url.pathname = `${PREFIX}/`
      return Response.redirect(url.toString(), 308)
    }

    if (!url.pathname.startsWith(`${PREFIX}/`)) {
      return new Response('Not found', { status: 404 })
    }

    const path = url.pathname.slice(PREFIX.length) || '/'
    const target = new URL(path + url.search, `${origin}/`)

    const headers = new Headers(request.headers)
    headers.delete('Host')
    headers.set('X-Forwarded-Host', url.host)
    headers.set('X-Forwarded-Proto', 'https')
    headers.set('X-Forwarded-Prefix', PREFIX)

    return fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    })
  },
}
