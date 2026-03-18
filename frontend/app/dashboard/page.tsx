'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  clearAuth,
  getStoredUser,
} from '@/lib/auth';

export default function DashboardPage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.replace('/login');
    }
  }, [mounted, user, router]);

  const handleLogout = (): void => {
    clearAuth();
    router.push('/');
    router.refresh();
  };

  if (!mounted || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      </main>
    );
  }

  const roleLabel = user.role === 'BUYER' ? 'Закупник' : 'Постачальник';

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Головна
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Вийти
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Кабінет</h1>
        <p className="mt-1 text-gray-600">
          Ви увійшли як <strong>{user.name}</strong> ({user.companyName}) — {roleLabel}.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/profile"
            className="rounded-lg border border-gray-200 bg-white p-4 font-medium text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50"
          >
            Профіль — особисті дані та аватар
          </Link>
          {user.role === 'BUYER' ? (
            <Link
              href="/buyer"
              className="rounded-lg border border-gray-200 bg-white p-4 font-medium text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50"
            >
              Кабінет закупника — пропозиції за моїми SKU, порівняння цін, контрпропозиції
            </Link>
          ) : (
            <Link
              href="/vendor"
              className="rounded-lg border border-gray-200 bg-white p-4 font-medium text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50"
            >
              Кабінет постачальника — мої пропозиції, відповіді на контрпропозиції
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
