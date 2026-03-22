'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser, clearAuth } from '@/lib/auth';

export default function HomePage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const handleLogout = (): void => {
    clearAuth();
    setUser(null);
    router.refresh();
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Кабінет
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Вийти
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Увійти
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Реєстрація
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Закупки та переговори в одному місці
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Закупники порівнюють пропозиції постачальників. Постачальники надсилають ціни та приймають контрпропозиції.
          </p>
        </div>

        {!user ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-center font-medium text-gray-800 hover:border-gray-400 hover:bg-gray-50 sm:w-auto"
            >
              Увійти в акаунт
            </Link>
            <Link
              href="/register"
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-center font-medium text-white hover:bg-indigo-700 sm:w-auto"
            >
              Зареєструватися
            </Link>
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Перейти в кабінет
          </Link>
        )}

        <div className="mt-8 flex gap-8 text-sm text-gray-500">
          <span>Закупник — створює SKU та приймає пропозиції</span>
          <span>Постачальник — надсилає ціни та веде переговори</span>
        </div>
      </div>
    </main>
  );
}
