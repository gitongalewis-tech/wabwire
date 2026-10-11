export const testMembershipMode = import.meta.env.VITE_ALLOW_TEST_MEMBERSHIP === 'true'

export function memberHome(user) {
  if (['ADMIN', 'SUPER_ADMIN'].includes(user?.role)) return '/admin'
  return user?.membershipStatus === 'ACTIVE' || testMembershipMode ? '/dashboard' : '/payment'
}
