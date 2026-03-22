'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Calendar,
  MessageCircle,
  User,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { getStoredUser, clearAuth, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { ChatListDto } from '@/lib/types/chat';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  matchPrefix: string;
}

function getNavItems(role: AuthUser['role']): NavItem[] {
  const home: NavItem =
    role === 'BUYER'
      ? { href: '/buyer', icon: LayoutDashboard, label: 'Головна', matchPrefix: '/buyer' }
      : { href: '/vendor', icon: LayoutDashboard, label: 'Головна', matchPrefix: '/vendor' };

  const items: NavItem[] = [home];

  if (role === 'BUYER') {
    items.push({
      href: '/buyer/catalog',
      icon: Package,
      label: 'Каталог SKU',
      matchPrefix: '/buyer/catalog',
    });
  }

  items.push(
    { href: '/calendar', icon: Calendar, label: 'Календар', matchPrefix: '/calendar' },
    { href: '/chats', icon: MessageCircle, label: 'Повідомлення', matchPrefix: '/chats' },
    { href: '/profile', icon: User, label: 'Профіль', matchPrefix: '/profile' },
  );

  return items;
}

export function GlobalNav(): JSX.Element | null {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);

  const fetchUnreadChats = useCallback(() => {
    getAuthApiClient()
      .get<ChatListDto[]>('/chats')
      .then((r) => {
        const total = r.data.reduce((sum, c) => sum + c.unreadCount, 0);
        setUnreadChats(total);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 30_000);
    return () => clearInterval(interval);
  }, [mounted, user, fetchUnreadChats]);

  if (!mounted || !user) return null;

  const navItems = getNavItems(user.role);

  const isActive = (item: NavItem): boolean => {
    if (item.matchPrefix === '/buyer' && pathname === '/buyer') return true;
    if (item.matchPrefix === '/buyer' && pathname.startsWith('/buyer/catalog')) return false;
    return pathname.startsWith(item.matchPrefix);
  };

  return (
    <nav className="flex h-full flex-col items-center justify-between py-4">
      <div className="flex flex-col items-center gap-1">
        <Link
          href="/dashboard"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground"
          title="RetailProcure"
        >
          RP
        </Link>

        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              title={item.label}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-x-[7px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5" />
              {item.matchPrefix === '/chats' && unreadChats > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {unreadChats > 99 ? '99+' : unreadChats}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          title={resolvedTheme === 'dark' ? 'Світла тема' : 'Темна тема'}
          aria-label={resolvedTheme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            clearAuth();
            window.location.href = '/';
          }}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Вийти"
          aria-label="Вийти з акаунту"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
