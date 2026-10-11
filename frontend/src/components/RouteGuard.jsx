import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { testMembershipMode } from '../config/testMode.js'

export function RequireAuth() {
  const { user, loading } = useAuth(); const location = useLocation()
  if (loading) return <div className="route-loading"><span /></div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RequireMember() {
  const { user } = useAuth()
  return user?.membershipStatus === 'ACTIVE' || testMembershipMode || ['ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? <Outlet /> : <Navigate to="/payment" replace />
}

export function RequireAdmin() {
  const { user } = useAuth()
  return ['ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? <Outlet /> : <Navigate to="/dashboard" replace />
}
