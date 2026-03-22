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

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
            RetailProcure
          </Link>
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
            <Link
              href="/calendar"
              prefetch={false}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Календар
            </Link>
            <Link
              href="/"
              prefetch={false}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Головна
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Вийти
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
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
