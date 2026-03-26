'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ScrollText,
  Calendar,
  MessageCircle,
  User,
  Users,
  Tags,
  Store,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { getStoredUser, clearAuth, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { getNotificationsSocket } from '@/lib/realtime/notifications-socket';
import type { ChatListDto } from '@/lib/types/chat';
import type { OfferListItem } from '@/lib/types/offer';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  matchPrefix: string;
  badge?: number;
}

function getNavItems(role: AuthUser['role']): NavItem[] {
  const items: NavItem[] = [];

  // 1. Угоди
  items.push({ href: '/offers', icon: ScrollText, label: 'Угоди', matchPrefix: '/offers' });

  // 2. Кабінет / Головна
  if (role === 'BUYER') {
    items.push({ href: '/buyer', icon: LayoutDashboard, label: 'Кабінет закупника', matchPrefix: '/buyer' });
  } else {
    items.push({ href: '/vendor', icon: LayoutDashboard, label: 'Головна', matchPrefix: '/vendor' });
  }

  // 3. Каталог товарів та 4. Каталог категорій (тільки BUYER)
  if (role === 'BUYER') {
    items.push({
      href: '/buyer/catalog',
      icon: Package,
      label: 'Каталог товарів',
      matchPrefix: '/buyer/catalog',
    });
    items.push({
      href: '/settings/categories',
      icon: Tags,
      label: 'Каталог категорій',
      matchPrefix: '/settings/categories',
    });
    items.push({
      href: '/buyer/vendors',
      icon: Store,
      label: 'Каталог постачальників',
      matchPrefix: '/buyer/vendors',
    });
  }

  // 5. Повідомлення
  items.push({ href: '/chats', icon: MessageCircle, label: 'Повідомлення', matchPrefix: '/chats' });

  // 6. Календар
  items.push({ href: '/calendar', icon: Calendar, label: 'Календар', matchPrefix: '/calendar' });

  // 7. Команда (тільки BUYER)
  if (role === 'BUYER') {
    items.push({
      href: '/team',
      icon: Users,
      label: 'Команда',
      matchPrefix: '/team',
    });
  }

  // 8. Профіль
  items.push({ href: '/profile', icon: User, label: 'Профіль', matchPrefix: '/profile' });

  return items;
}

const DEBOUNCE_MS = 500;

export function GlobalNav(): JSX.Element | null {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadDeals, setUnreadDeals] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnreadChats = useCallback(() => {
    getAuthApiClient()
      .get<ChatListDto[]>('/chats')
      .then((r) => {
        const total = r.data.reduce((sum, c) => sum + c.unreadCount, 0);
        setUnreadChats(total);
      })
      .catch(() => undefined);
  }, []);

  const fetchUnreadDeals = useCallback(() => {
    const api = getAuthApiClient();
    api
      .get<OfferListItem[]>('/offers', { params: { showArchived: 'false' } })
      .then((r) => {
        const active = r.data.filter((o) => !o.isArchived);
        const ids = active.map((o) => o.id);
        if (ids.length === 0) {
          setUnreadDeals(0);
          return;
        }
        return api
          .get<Record<string, number>>('/offers/unread-counts', {
            params: { ids: ids.join(',') },
          })
          .then((cr) => {
            const total = Object.values(cr.data).reduce((s, n) => s + n, 0);
            setUnreadDeals(total);
          });
      })
      .catch(() => undefined);
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUnreadChats();
      fetchUnreadDeals();
    }, DEBOUNCE_MS);
  }, [fetchUnreadChats, fetchUnreadDeals]);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    fetchUnreadChats();
    fetchUnreadDeals();
  }, [mounted, user, fetchUnreadChats, fetchUnreadDeals]);

  useEffect(() => {
    if (!mounted || !user) return;

    const socket = getNotificationsSocket();

    const handleOfferEvent = () => debouncedRefresh();
    const handleChatEvent = () => debouncedRefresh();

    socket.on('notification:offer_message', handleOfferEvent);
    socket.on('notification:offer_update', handleOfferEvent);
    socket.on('notification:chat_message', handleChatEvent);

    return () => {
      socket.off('notification:offer_message', handleOfferEvent);
      socket.off('notification:offer_update', handleOfferEvent);
      socket.off('notification:chat_message', handleChatEvent);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mounted, user, debouncedRefresh]);

  if (!mounted || !user) return null;

  const navItems = getNavItems(user.role).map((item) => {
    if (item.matchPrefix === '/chats') return { ...item, badge: unreadChats };
    if (item.matchPrefix === '/offers') return { ...item, badge: unreadDeals };
    return item;
  });

  const isActive = (item: NavItem): boolean => {
    if (item.matchPrefix === '/buyer' && pathname === '/buyer') return true;
    if (item.matchPrefix === '/buyer' && (pathname.startsWith('/buyer/catalog') || pathname.startsWith('/buyer/vendors'))) return false;
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
          const badge = item.badge ?? 0;
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
              {badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {badge > 99 ? '99+' : badge}
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
