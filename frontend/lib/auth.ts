export const AUTH_TOKEN_KEY = 'teno_token';
export const AUTH_USER_KEY = 'teno_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  companyName: string;
  phone?: string | null;
  avatarPath?: string | null;
  role: 'BUYER' | 'VENDOR';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(result: AuthResult): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
