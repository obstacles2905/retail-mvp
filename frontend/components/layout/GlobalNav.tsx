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
  LineChart,
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
  iconColor: string;
  badge?: number;
}

function getNavItems(role: AuthUser['role']): NavItem[] {
  const items: NavItem[] = [];

  items.push({ href: '/offers', icon: ScrollText, label: 'Угоди', matchPrefix: '/offers', iconColor: 'text-blue-500' });

  if (role === 'BUYER') {
    items.push({ href: '/buyer', icon: LayoutDashboard, label: 'Кабінет закупника', matchPrefix: '/buyer', iconColor: 'text-emerald-500' });
  } else {
    items.push({ href: '/vendor', icon: LayoutDashboard, label: 'Головна', matchPrefix: '/vendor', iconColor: 'text-emerald-500' });
  }

  if (role === 'BUYER') {
    items.push({ href: '/buyer/catalog', icon: Package, label: 'Каталог товарів', matchPrefix: '/buyer/catalog', iconColor: 'text-cyan-500' });
    items.push({ href: '/settings/categories', icon: Tags, label: 'Каталог категорій', matchPrefix: '/settings/categories', iconColor: 'text-pink-500' });
    items.push({ href: '/buyer/vendors', icon: Store, label: 'Каталог постачальників', matchPrefix: '/buyer/vendors', iconColor: 'text-orange-500' });
  }

  items.push({ href: '/chats', icon: MessageCircle, label: 'Повідомлення', matchPrefix: '/chats', iconColor: 'text-violet-500' });
  items.push({ href: '/calendar', icon: Calendar, label: 'Календар', matchPrefix: '/calendar', iconColor: 'text-amber-500' });

  if (role === 'BUYER') {
    items.push({ href: '/analytics', icon: LineChart, label: 'Аналітика', matchPrefix: '/analytics', iconColor: 'text-indigo-500' });
    items.push({ href: '/team', icon: Users, label: 'Команда', matchPrefix: '/team', iconColor: 'text-teal-500' });
  }

  items.push({ href: '/profile', icon: User, label: 'Профіль', matchPrefix: '/profile', iconColor: 'text-slate-400' });

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
    <nav className="flex h-full flex-col justify-between px-2 py-4">
      <div className="flex min-h-0 flex-col gap-1">
        <Link
          href="/dashboard"
          className="mb-3 flex h-10 w-full shrink-0 items-center gap-2 rounded-lg px-3 text-white"
          title="Teno"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center  bg-[#2563eb] rounded-md font-bold text-lg leading-none">
            T
          </span>
          <span className="truncate text-sm font-semibold">Teno</span>
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
                'flex h-10 w-full min-w-0 items-center gap-3 rounded-lg border-l-4 pl-2 pr-2 text-sm transition-colors',
                active
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', item.iconColor)} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex h-10 w-full min-w-0 items-center gap-3 rounded-lg border-l-4 border-transparent pl-2 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          title={resolvedTheme === 'dark' ? 'Світла тема' : 'Темна тема'}
          aria-label={resolvedTheme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          <span className="min-w-0 truncate">{resolvedTheme === 'dark' ? 'Світла тема' : 'Темна тема'}</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            const currentUser = getStoredUser();
            if (currentUser?.isDemo) {
              try {
                await getAuthApiClient().delete('/auth/demo');
              } catch (e) {
                console.error('Failed to cleanup demo account', e);
              }
            }
            clearAuth();
            window.location.href = '/';
          }}
          className="flex h-10 w-full min-w-0 items-center gap-3 rounded-lg border-l-4 border-transparent pl-2 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Вийти"
          aria-label="Вийти з акаунту"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="min-w-0 truncate">Вийти</span>
        </button>
      </div>
    </nav>
  );
}
