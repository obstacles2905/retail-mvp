'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  Package,
  ScrollText,
  Store,
  Tags,
  User,
  Users,
} from 'lucide-react';
import { getStoredUser, type AuthUser } from '@/lib/auth';

interface DashCard {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}

function getCards(role: AuthUser['role']): DashCard[] {
  const common: DashCard[] = [
    {
      href: '/offers',
      icon: ScrollText,
      title: 'Угоди',
      description: 'Переговори, ціни, умови поставок',
      accent: 'from-blue-500/15 to-blue-600/5 text-blue-500',
    },
    {
      href: '/chats',
      icon: MessageCircle,
      title: 'Повідомлення',
      description: 'Прямі чати з контрагентами',
      accent: 'from-violet-500/15 to-violet-600/5 text-violet-500',
    },
    {
      href: '/calendar',
      icon: Calendar,
      title: 'Календар',
      description: 'Графік доставок та подій',
      accent: 'from-amber-500/15 to-amber-600/5 text-amber-500',
    },
    {
      href: '/profile',
      icon: User,
      title: 'Профіль',
      description: 'Особисті дані, аватар, налаштування',
      accent: 'from-slate-500/15 to-slate-600/5 text-slate-400',
    },
  ];

  if (role === 'BUYER') {
    return [
      {
        href: '/buyer',
        icon: LayoutDashboard,
        title: 'Кабінет закупника',
        description: 'Пропозиції за SKU, порівняння цін',
        accent: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
      },
      ...common.slice(0, 1),
      {
        href: '/buyer/catalog',
        icon: Package,
        title: 'Каталог товарів',
        description: 'Управління матрицею SKU',
        accent: 'from-cyan-500/15 to-cyan-600/5 text-cyan-500',
      },
      {
        href: '/settings/categories',
        icon: Tags,
        title: 'Категорії',
        description: 'Каталог категорій товарів',
        accent: 'from-pink-500/15 to-pink-600/5 text-pink-500',
      },
      {
        href: '/buyer/vendors',
        icon: Store,
        title: 'Постачальники',
        description: 'Каталог постачальників',
        accent: 'from-orange-500/15 to-orange-600/5 text-orange-500',
      },
      ...common.slice(1),
      {
        href: '/analytics',
        icon: LineChart,
        title: 'Аналітика',
        description: 'Статистика закупівель та витрат',
        accent: 'from-indigo-500/15 to-indigo-600/5 text-indigo-500',
      },
      {
        href: '/team',
        icon: Users,
        title: 'Команда',
        description: 'Управління учасниками',
        accent: 'from-teal-500/15 to-teal-600/5 text-teal-500',
      },
    ];
  }

  return [
    {
      href: '/vendor',
      icon: LayoutDashboard,
      title: 'Кабінет постачальника',
      description: 'Мої пропозиції та контрпропозиції',
      accent: 'from-emerald-500/15 to-emerald-600/5 text-emerald-500',
    },
    ...common,
  ];
}

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

  if (!mounted || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  const roleLabel = user.role === 'BUYER' ? 'Закупник' : 'Постачальник';
  const cards = getCards(user.role);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Вітаємо, {user.name?.split(' ')[0] ?? user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.companyName} &middot; {roleLabel}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const [gradientClasses, iconColor] = card.accent.split(' text-');
            return (
              <Link
                key={card.href}
                href={card.href}
                prefetch={false}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
              >
                <div>
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradientClasses}`}
                  >
                    <Icon className={`h-5 w-5 text-${iconColor}`} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  Перейти
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
