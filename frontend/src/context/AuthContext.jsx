import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../services/api.js'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try { const result = await api('/auth/me'); setUser(result.user); return result.user }
    catch (error) {
      // An API/network error should not be treated as a confirmed sign-out.
      // Only clear the signed-in state when the server explicitly rejects the session.
      if (error.status === 401 || error.status === 403) setUser(null)
      return null
    }
    finally { setLoading(false) }
  }, [])
  const verifyEmail = useCallback(async token => {
    const result = await api('/auth/verify-email', { method: 'POST', body: { token } })
    setUser(result.user)
    setLoading(false)
    return result.user
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const login = async credentials => { const result = await api('/auth/login', { method: 'POST', body: credentials }); setUser(result.user); return result.user }
  const register = async details => { const result = await api('/auth/register', { method: 'POST', body: details }); if (result.user) setUser(result.user); return result }
  const logout = async () => { try { await api('/auth/logout', { method: 'POST', body: {} }) } catch { /* Clear the local session if the API is unreachable. */ } finally { setUser(null) } }
  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, verifyEmail }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value }
