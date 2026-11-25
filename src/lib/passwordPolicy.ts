export type ComsChatPasswordRole = 'superadmin' | 'admin' | 'subadmin' | 'agent' | 'employee'

const REQUIRED_CHARACTER: Record<ComsChatPasswordRole, string> = {
  superadmin: '#',
  admin: '@',
  subadmin: '@',
  agent: '$',
  employee: '$',
}

export function passwordPolicyError(password: string, role: ComsChatPasswordRole): string | null {
  if (password.length < 8) return 'Password minimum 8 characters ka hona chahiye.'
  const required = REQUIRED_CHARACTER[role]
  if (!password.includes(required)) {
    const label = role === 'superadmin' ? 'Super Admin' : role === 'admin' || role === 'subadmin' ? 'Admin' : 'Agent'
    return label + ' password mein kam se kam ek ' + required + ' character mandatory hai.'
  }
  return null
}

export function isPasswordValidForRole(password: string, role: ComsChatPasswordRole): boolean {
  return passwordPolicyError(password, role) === null
}
