import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

interface TokenPayload {
  user_id: number
  role: string
  email?: string
  library_id?: number
  exp: number
}

const COOKIE_OPTS = { expires: 7, path: '/' } as const

export function getToken(): string | undefined {
  return Cookies.get('token')
}

export function getRefreshToken(): string | undefined {
  return Cookies.get('refresh_token')
}

export function setTokens(accessToken: string, refreshToken: string): void {
  Cookies.set('token', accessToken, COOKIE_OPTS)
  Cookies.set('refresh_token', refreshToken, COOKIE_OPTS)
  const payload = jwtDecode<TokenPayload>(accessToken)
  Cookies.set('role', payload.role.toLowerCase(), COOKIE_OPTS)
  if (payload.email) {
    Cookies.set('email', payload.email, COOKIE_OPTS)
  }
  if (payload.library_id) {
    Cookies.set('library_id', String(payload.library_id), COOKIE_OPTS)
  }
}

// Keep backward compat — calls setTokens with empty refresh
export function setToken(token: string, refreshToken?: string): void {
  setTokens(token, refreshToken ?? Cookies.get('refresh_token') ?? '')
}

export function removeToken(): void {
  Cookies.remove('token', { path: '/' })
  Cookies.remove('refresh_token', { path: '/' })
  Cookies.remove('role', { path: '/' })
  Cookies.remove('email', { path: '/' })
  Cookies.remove('library_id', { path: '/' })
}

export function getRole(): string | undefined {
  return Cookies.get('role')
}

export function isAdmin(): boolean {
  return getRole()?.toLowerCase() === 'admin'
}

export function isStaff(): boolean {
  const role = getRole()?.toLowerCase()
  return role === 'library' || role === 'staff'
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
