'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { setAuth, getStoredUser, getStoredToken } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { ThemeToggle } from '@/components/ThemeToggle';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function JoinByInvitePage(): JSX.Element {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [buyerCompanyName, setBuyerCompanyName] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    setToken(url.searchParams.get('token'));
  }, []);

  useEffect(() => {
    if (!token) {
      if (status !== 'loading') setStatus('invalid');
      return;
    }
    fetch(`${API_URL}/invites/validate/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { valid: boolean; buyerCompanyName?: string }) => {
        if (data.valid) {
          setStatus('valid');
          setBuyerCompanyName(data.buyerCompanyName ?? '');
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token, status]);

  const api = createApiClient();

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароль та підтвердження пароля не збігаються.');
      return;
    }
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/register', {
        email,
        password,
        confirmPassword,
        name,
        companyName,
        role: 'VENDOR',
        inviteToken: token,
      });
      setAuth({ accessToken: data.accessToken, user: data.user });
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string | string[] }; status?: number } })
        : undefined;
      const data = ax?.response?.data;
      const msg = data?.message;
      const message =
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg.join(', ')
            : ax?.response?.status === 409
              ? 'Користувач з таким email вже зареєстрований.'
              : ax?.response?.status === 403
                ? 'Посилання вже використане або минуло.'
                : 'Помилка реєстрації. Перевірте дані.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      setAuth({ accessToken: data.accessToken, user: data.user });
      
      const authApi = createApiClient({ getToken: () => data.accessToken });
      await authApi.post('/invites/accept', { token });
      
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError('Невірний email або пароль, або помилка прийняття запрошення.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExisting = async (): Promise<void> => {
    if (!token || !currentUser) return;
    setError(null);
    setLoading(true);
    try {
      const authApi = createApiClient({ getToken: getStoredToken });
      await authApi.post('/invites/accept', { token });
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError('Не вдалося прийняти запрошення. Можливо, воно вже використане.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  if (status === 'invalid') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold text-foreground">Недійсне посилання</h1>
        <p className="text-center text-muted-foreground">
          Посилання-запрошення не знайдено, вже використане або минуло. Запросіть нове в закупника.
        </p>
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          На головну
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
       <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white">
              <span className="font-bold text-lg leading-none">T</span>
            </div>
            Teno
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Запрошення від закупника</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Вас запросив закупник <strong>{buyerCompanyName || 'компанія'}</strong>.
          </p>
        </div>

        {currentUser ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-foreground">Ви вже увійшли як <strong>{currentUser.name}</strong> ({currentUser.companyName}).</p>
              <p className="mt-2 text-sm text-muted-foreground">Бажаєте прийняти запрошення для цього акаунту?</p>
            </div>
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <button
              onClick={handleAcceptExisting}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Обробка…' : 'Прийняти запрошення'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Новий акаунт
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Вже є акаунт
              </button>
            </div>

            <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="join-email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="join-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="join-password" className="block text-sm font-medium text-foreground">
                  Пароль {mode === 'register' && '(не менше 8 символів)'}
                </label>
                <input
                  id="join-password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="join-confirm" className="block text-sm font-medium text-foreground">
                      Підтвердження пароля
                    </label>
                    <input
                      id="join-confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={64}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="join-name" className="block text-sm font-medium text-foreground">
                      Ім'я
                    </label>
                    <input
                      id="join-name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="join-company" className="block text-sm font-medium text-foreground">
                      Назва компанії
                    </label>
                    <input
                      id="join-company"
                      type="text"
                      autoComplete="organization"
                      required
                      maxLength={100}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Обробка…' : mode === 'register' ? 'Зареєструватися' : 'Увійти та прийняти'}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">Або</span>
              </div>
            </div>

            <a
              href={`${API_URL}/auth/google?state=${typeof window !== 'undefined' ? btoa(JSON.stringify({ inviteToken: token, role: 'VENDOR' })) : ''}`}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Продовжити через Google
            </a>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:text-primary/90">
            ← На головну
          </Link>
        </p>
      </div>
    </main>
  );
}
