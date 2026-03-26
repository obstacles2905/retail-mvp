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
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  const roleLabel = user.role === 'BUYER' ? 'Закупник' : 'Постачальник';

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Кабінет</h1>
        <p className="mt-1 text-muted-foreground">
          Ви увійшли як <strong>{user.name}</strong> ({user.companyName}) — {roleLabel}.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/chats"
            prefetch={false}
            className="rounded-lg border border-border bg-card p-4 font-medium text-foreground shadow-sm hover:border-muted-foreground/25 hover:bg-muted/50"
          >
            Повідомлення — прямі чати
          </Link>
          <Link
            href="/profile"
            prefetch={false}
            className="rounded-lg border border-border bg-card p-4 font-medium text-foreground shadow-sm hover:border-muted-foreground/25 hover:bg-muted/50"
          >
            Профіль — особисті дані та аватар
          </Link>
          {user.role === 'BUYER' ? (
            <>
              <Link
                href="/buyer"
                prefetch={false}
                className="rounded-lg border border-border bg-card p-4 font-medium text-foreground shadow-sm hover:border-muted-foreground/25 hover:bg-muted/50"
              >
                Кабінет закупника — пропозиції за моїми SKU, порівняння цін, контрпропозиції
              </Link>
              <Link
                href="/buyer/catalog"
                prefetch={false}
                className="rounded-lg border border-border bg-card p-4 font-medium text-foreground shadow-sm hover:border-muted-foreground/25 hover:bg-muted/50"
              >
                Каталог товарів (SKU) — управління матрицею товарів
              </Link>
            </>
          ) : (
            <Link
              href="/vendor"
              prefetch={false}
              className="rounded-lg border border-border bg-card p-4 font-medium text-foreground shadow-sm hover:border-muted-foreground/25 hover:bg-muted/50"
            >
              Кабінет постачальника — мої пропозиції, відповіді на контрпропозиції
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
