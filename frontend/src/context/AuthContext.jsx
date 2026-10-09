import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../services/api.js'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try { const result = await api('/auth/me'); setUser(result.user); return result.user }
    catch { setUser(null); return null }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const login = async credentials => { const result = await api('/auth/login', { method: 'POST', body: credentials }); setUser(result.user); return result.user }
  const register = async details => { const result = await api('/auth/register', { method: 'POST', body: details }); setUser(result.user); return result.user }
  const logout = async () => { try { await api('/auth/logout', { method: 'POST', body: {} }) } catch { /* Clear the local session if the API is unreachable. */ } finally { setUser(null) } }
  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value }
