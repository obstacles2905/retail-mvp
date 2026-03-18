'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createApiClient } from '@/lib/api-client';
import { setAuth } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

type Role = 'BUYER' | 'VENDOR';

export default function RegisterPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const api = createApiClient();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароль та підтвердження пароля не збігаються.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/register', {
        email,
        password,
        confirmPassword,
        name,
        companyName,
        role,
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Реєстрація</h1>
          <p className="mt-1 text-sm text-gray-500">
            Вже є акаунт?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Увійти
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
            <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700">
              Я реєструюся як
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="BUYER">Закупник</option>
              <option value="VENDOR">Постачальник</option>
            </select>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700">
              Ім'я
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="reg-company" className="block text-sm font-medium text-gray-700">
              Назва компанії
            </label>
            <input
              id="reg-company"
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
