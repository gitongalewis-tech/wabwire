const configuredBase = import.meta.env.VITE_API_URL
// Production uses the frontend origin as a same-site API proxy. This keeps
// auth cookies first-party and avoids browsers blocking a cross-site Vercel cookie.
const productionBase = configuredBase?.startsWith('/') ? configuredBase : '/api/v1'
const base = (import.meta.env.PROD ? productionBase : configuredBase || 'http://localhost:4000/api/v1').replace(/\/$/, '')

export async function api(path, options = {}) {
  const response = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body instanceof FormData ? options.body : options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  })
  let data = {}
  try { data = await response.json() } catch { /* empty response body */ }
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`)
    error.status = response.status
    error.details = data.details
    throw error
  }
  return data
}

export function friendlyError(error) {
  if (error instanceof TypeError) return 'The server could not be reached. Check your connection and try again.'
  return error.message || 'Something went wrong. Please try again.'
}
