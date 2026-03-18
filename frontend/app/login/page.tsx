'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { setAuth } from '@/lib/auth';

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const api = createApiClient();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: unknown }>('/auth/login', {
        email,
        password,
      });
      setAuth({
        accessToken: data.accessToken,
        user: data.user as Parameters<typeof setAuth>[0]['user'],
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
          ? (err.response as { data: { message: string } }).data.message
          : 'Помилка входу. Перевірте email та пароль.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold text-gray-900">Вхід в акаунт</h1>
          <p className="mt-1 text-sm text-gray-500">
            Немає акаунта?{' '}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Зареєструватися
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
              Пароль
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Вхід…' : 'Увійти'}
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
