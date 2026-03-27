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
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const handleCreateDemo = async () => {
    try {
      setIsCreatingDemo(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/demo`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to create demo account');
      const data = await res.json();
      
      // Save auth data
      localStorage.setItem('teno_token', data.accessToken);
      localStorage.setItem('teno_user', JSON.stringify(data.user));
      
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Помилка при створенні демо-акаунту');
    } finally {
      setIsCreatingDemo(false);
    }
  };

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
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 text-sm text-blue-600 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400">
          <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
          Систему успішно запущено
        </div>

        <div className="text-center max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            <span className="text-blue-600 dark:text-blue-500">Teno</span>-закупівлі без <br className="hidden sm:block" />
            <span className="text-blue-600 dark:text-blue-500">хаосу в месенджерах</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Забудьте про розрізнені Excel-таблиці та нескінченні чати у Viber. Teno об'єднує ваш каталог SKU, постачальників та історію торгів у єдиній прозорій системі. Економте час менеджерів та бюджет компанії.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row w-full sm:w-auto mt-4">
          {!user ? (
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 font-medium text-white hover:bg-blue-700 sm:w-auto transition-colors"
            >
              Створити компанію
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 font-medium text-white hover:bg-blue-700 sm:w-auto transition-colors"
            >
              Перейти в кабінет
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          )}
          
          <button
            onClick={handleCreateDemo}
            disabled={isCreatingDemo}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-input bg-background px-8 py-3.5 font-medium text-foreground hover:bg-accent hover:text-accent-foreground sm:w-auto transition-colors disabled:opacity-50"
          >
            {isCreatingDemo ? 'Створення...' : 'Демонстрація'}
          </button>
        </div>
      </div>
    </main>
  );
}
