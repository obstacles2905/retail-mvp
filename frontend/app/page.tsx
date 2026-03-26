'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser, clearAuth } from '@/lib/auth';
import GlobalHeader from '@/components/layout/GlobalHeader';
import { ThemeToggle } from '@/components/ThemeToggle';

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
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </main>
    );
  }

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

      <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Закупки та переговори в одному місці
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Закупники порівнюють пропозиції постачальників. Постачальники надсилають ціни та приймають контрпропозиції.
          </p>
        </div>

        {!user ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg border-2 border-input bg-card px-6 py-3 text-center font-medium text-foreground hover:border-muted-foreground/40 hover:bg-muted/50 sm:w-auto"
            >
              Увійти в акаунт
            </Link>
            <Link
              href="/register"
              className="w-full rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              Зареєструватися
            </Link>
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Перейти в кабінет
          </Link>
        )}

        <div className="mt-8 flex gap-8 text-sm text-muted-foreground">
          <span>Закупник — створює SKU та приймає пропозиції</span>
          <span>Постачальник — надсилає ціни та веде переговори</span>
        </div>
      </div>
    </main>
  );
}
