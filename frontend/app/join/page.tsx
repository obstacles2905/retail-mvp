'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { setAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function JoinByInvitePage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [buyerCompanyName, setBuyerCompanyName] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
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
  }, [token]);

  const api = createApiClient();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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
      const msg = ax?.response?.data?.message;
      const message =
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg.join(', ')
            : ax?.response?.status === 403
              ? 'Посилання вже використане або минуло.'
              : 'Помилка реєстрації. Перевірте дані.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      </main>
    );
  }

  if (status === 'invalid') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold text-gray-900">Недійсне посилання</h1>
        <p className="text-center text-gray-600">
          Посилання-запрошення не знайдено, вже використане або минуло. Запросіть нове в закупника.
        </p>
        <Link
          href="/"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          На головну
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Реєстрація постачальника</h1>
          <p className="mt-1 text-sm text-gray-600">
            Вас запросив закупник <strong>{buyerCompanyName || 'компанія'}</strong>. Заповніть дані — після реєстрації ви зможете пропонувати угоди за їхніми товарами.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="join-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="join-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="join-password" className="block text-sm font-medium text-gray-700">
              Пароль (не менше 8 символів)
            </label>
            <input
              id="join-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="join-confirm" className="block text-sm font-medium text-gray-700">
              Підтвердження пароля
            </label>
            <input
              id="join-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="join-name" className="block text-sm font-medium text-gray-700">
              Ім'я
            </label>
            <input
              id="join-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="join-company" className="block text-sm font-medium text-gray-700">
              Назва компанії
            </label>
            <input
              id="join-company"
              type="text"
              autoComplete="organization"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Реєстрація…' : 'Зареєструватися'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link href="/" className="text-indigo-600 hover:text-indigo-500">
            ← На головну
          </Link>
        </p>
      </div>
    </main>
  );
}
