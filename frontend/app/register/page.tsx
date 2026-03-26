'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { createApiClient } from '@/lib/api-client';
import { setAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { ThemeToggle } from '@/components/ThemeToggle';

type Role = 'BUYER' | 'VENDOR';

function RegisterContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamToken = searchParams.get('teamToken');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingTeam, setFetchingTeam] = useState(false);

  const api = createApiClient();

  useEffect(() => {
    if (teamToken) {
      setRole('BUYER');
      setFetchingTeam(true);
      createApiClient()
        .get<{ workspaceName: string }>(`/workspaces/invite-info/${teamToken}`)
        .then((res) => {
          setCompanyName(res.data.workspaceName);
        })
        .catch(() => {
          setError('Недійсне або прострочене посилання на приєднання до команди.');
        })
        .finally(() => {
          setFetchingTeam(false);
        });
    }
  }, [teamToken]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароль та підтвердження пароля не збігаються.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        email,
        password,
        confirmPassword,
        name,
        companyName,
        role,
      };
      if (teamToken) {
        payload.teamToken = teamToken;
      }

      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/register', payload);
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
              : !ax?.response
                ? 'Сервер недоступний. Запустіть бекенд (npm run start:dev у папці backend).'
                : 'Помилка реєстрації. Перевірте дані (пароль не менше 8 символів).';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
       <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
            Teno
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Реєстрація</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Вже є акаунт?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/90">
              Увійти
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          {!teamToken && (
            <div>
              <label htmlFor="reg-role" className="block text-sm font-medium text-foreground">
                Я реєструюся як
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="BUYER">Закупник</option>
                <option value="VENDOR">Постачальник</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-foreground">
              Пароль (не менше 8 символів)
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-foreground">
              Підтвердження пароля
            </label>
            <input
              id="reg-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-foreground">
              Ім'я
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {!teamToken && (
            <div>
              <label htmlFor="reg-company" className="block text-sm font-medium text-foreground">
                Назва компанії
              </label>
              <input
                id="reg-company"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          {teamToken && (
            <div>
              <label className="block text-sm font-medium text-foreground">
                Компанія
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={fetchingTeam ? 'Завантаження...' : companyName}
                className="mt-1 block w-full rounded-md border border-input bg-muted px-3 py-2 text-muted-foreground shadow-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Реєстрація…' : 'Зареєструватися'}
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
          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/auth/google?state=${typeof window !== 'undefined' ? btoa(JSON.stringify(teamToken ? { role: 'BUYER', teamToken } : { role: role })) : ''}`}
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

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:text-primary/90">
            ← На головну
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
