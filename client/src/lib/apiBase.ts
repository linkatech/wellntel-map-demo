/**
 * Same-origin API. Dev uses the Vite `/api` proxy (BASE_URL `/`).
 * Production build uses BASE_URL `/wellntel/map-services-and-meta/` so the
 * browser calls the prefixed path; the Worker strips it for Express.
 * VITE_API_URL overrides when the API is on a different origin.
 */
export function apiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  if (explicit) return explicit
  return import.meta.env.BASE_URL.replace(/\/$/, '')
}

export function apiPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = apiBaseUrl()
  return base ? `${base}${normalized}` : normalized
}