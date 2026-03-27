'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Package, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import {
  connectNotifications,
  getNotificationsSocket,
} from '@/lib/realtime/notifications-socket';
import { OFFERS_LIST_REFRESH_EVENT } from '@/lib/offers-list-refresh';
import type { OfferListItem, OfferStatus } from '@/lib/types/offer';

import { formatDistanceToNow, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';

const HIDDEN_STATUSES: OfferStatus[] = ['ARCHIVED'];

const STATUS_LABELS: Record<OfferStatus, string> = {
  NEW: 'Нова',
  IN_REVIEW: 'На розгляді',
  COUNTER_OFFER: 'Контрпропозиція',
  ACCEPTED: 'Прийнято',
  REJECTED: 'Відхилено',
  AWAITING_DELIVERY: 'Очікує доставку',
  DELIVERED: 'Доставлено',
  ARCHIVED: 'Архів',
};

const STATUS_COLORS: Record<OfferStatus, string> = {
  NEW: 'text-info bg-info/10 px-1.5 py-0.5 rounded',
  IN_REVIEW: 'text-warning bg-warning/10 px-1.5 py-0.5 rounded',
  COUNTER_OFFER: 'text-warning bg-warning/10 px-1.5 py-0.5 rounded',
  ACCEPTED: 'text-success bg-success/10 px-1.5 py-0.5 rounded',
  REJECTED: 'text-destructive bg-destructive/10 px-1.5 py-0.5 rounded',
  AWAITING_DELIVERY: 'text-primary bg-primary/10 px-1.5 py-0.5 rounded',
  DELIVERED: 'text-success bg-success/10 px-1.5 py-0.5 rounded',
  ARCHIVED: 'text-muted-foreground bg-muted px-1.5 py-0.5 rounded',
};

const STATUS_ICON_COLORS: Record<OfferStatus, string> = {
  NEW: 'text-info bg-info/10',
  IN_REVIEW: 'text-warning bg-warning/10',
  COUNTER_OFFER: 'text-warning bg-warning/10',
  ACCEPTED: 'text-success bg-success/10',
  REJECTED: 'text-destructive bg-destructive/10',
  AWAITING_DELIVERY: 'text-primary bg-primary/10',
  DELIVERED: 'text-success bg-success/10',
  ARCHIVED: 'text-muted-foreground bg-muted',
};

function getCounterpartyName(offer: OfferListItem, role: AuthUser['role']): string {
  if (role === 'BUYER') return offer.vendor.companyName;
  return offer.buyer?.companyName ?? '—';
}

function getProductName(offer: OfferListItem): string {
  const items = offer.items ?? [];
  if (items.length === 0) return '—';
  const firstName = items[0].sku?.name ?? items[0].productName ?? '—';
  if (items.length === 1) return firstName;
  return `${firstName} +${items.length - 1}`;
}

/** Prefer API count; if not loaded yet, fall back to list `hasUnread` so the badge is never missing. */
function effectiveUnread(
  offer: OfferListItem,
  unreadMap: Record<string, number>,
): number {
  const id = offer.id;
  if (Object.prototype.hasOwnProperty.call(unreadMap, id)) {
    return unreadMap[id] ?? 0;
  }
  return offer.hasUnread ? 1 : 0;
}

function DealCard({
  offer,
  isActive,
  unreadCount,
  userRole,
}: {
  offer: OfferListItem;
  isActive: boolean;
  unreadCount: number;
  userRole: AuthUser['role'];
}): JSX.Element {
  let deliveryText = '';
  if (offer.status === 'AWAITING_DELIVERY' && offer.deliveryDate) {
    const date = new Date(offer.deliveryDate);
    if (isPast(date)) {
      deliveryText = 'Протерміновано';
    } else {
      deliveryText = formatDistanceToNow(date, { locale: uk, addSuffix: true });
    }
  }

  return (
    <Link
      href={`/offers/${offer.id}`}
      prefetch={false}
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted/50',
      )}
    >
      <div className={cn('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md', STATUS_ICON_COLORS[offer.status])}>
        <Package className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm ring-2 ring-card"
            aria-label={`Непрочитані: ${unreadCount}`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {getProductName(offer)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground mb-1">
          {getCounterpartyName(offer, userRole)}
        </p>
        <div className="flex flex-col gap-1 items-start">
          <span className={cn('text-[10px] font-medium', STATUS_COLORS[offer.status])}>
            {STATUS_LABELS[offer.status]}
          </span>
          {deliveryText && (
            <span className="text-[10px] text-primary font-medium">
              Доставка: {deliveryText}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const REFRESH_DEBOUNCE_MS = 500;

export function DealSidebar(): JSX.Element | null {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const fetchUnreadCounts = useCallback((offerIds: string[]) => {
    if (offerIds.length === 0) {
      setUnread({});
      return;
    }
    getAuthApiClient()
      .get<Record<string, number>>('/offers/unread-counts', {
        params: { ids: offerIds.join(',') },
      })
      .then((r) => setUnread(r.data))
      .catch(() => undefined);
  }, []);

  const fetchOffers = useCallback(() => {
    const api = getAuthApiClient();
    api
      .get<OfferListItem[]>('/offers', { params: { showArchived: 'false' } })
      .then((r) => {
        const active = r.data.filter(
          (o) => !HIDDEN_STATUSES.includes(o.status) && !o.isArchived,
        );
        setOffers(active);
        fetchUnreadCounts(active.map((o) => o.id));
      })
      .catch(() => {
        setOffers([]);
        setUnread({});
      })
      .finally(() => setLoading(false));
  }, [fetchUnreadCounts]);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOffers();
    }, REFRESH_DEBOUNCE_MS);
  }, [fetchOffers]);

  // Initial load + refetch when navigating (e.g. after archive, create offer redirect, /offers list).
  useEffect(() => {
    if (!mounted || !user) return;
    connectNotifications();
    fetchOffers();
  }, [mounted, user, pathname, fetchOffers]);

  useEffect(() => {
    if (!mounted || !user) return;

    const socket = getNotificationsSocket();

    const handleOfferEvent = () => {
      debouncedRefresh();
    };

    socket.on('notification:offer_message', handleOfferEvent);
    socket.on('notification:offer_update', handleOfferEvent);
    socket.on('connect', handleOfferEvent);

    return () => {
      socket.off('notification:offer_message', handleOfferEvent);
      socket.off('notification:offer_update', handleOfferEvent);
      socket.off('connect', handleOfferEvent);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mounted, user, debouncedRefresh]);

  // If the socket missed an event, catch up when the tab becomes visible again.
  useEffect(() => {
    if (!mounted || !user) return;
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') fetchOffers();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [mounted, user, fetchOffers]);

  useEffect(() => {
    if (!mounted || !user) return;
    const onClientRefresh = (): void => fetchOffers();
    window.addEventListener(OFFERS_LIST_REFRESH_EVENT, onClientRefresh);
    return () => window.removeEventListener(OFFERS_LIST_REFRESH_EVENT, onClientRefresh);
  }, [mounted, user, fetchOffers]);

  const totalUnread = offers.reduce(
    (sum, o) => sum + effectiveUnread(o, unread),
    0,
  );

  if (!mounted || !user) return null;

  const activeOfferId = pathname.startsWith('/offers/')
    ? pathname.split('/')[2]
    : null;

  const createHref = user.role === 'BUYER' ? '/buyer' : '/vendor';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center border-b border-border px-4 py-3 h-14">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-semibold tracking-tight">
            Активні угоди
          </h2>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex flex-col gap-2 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Немає активних угод
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Створіть нову пропозицію або дочекайтеся вхідних від контрагентів.
            </p>
            <Link
              href={createHref}
              prefetch={false}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Створити
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {offers.map((offer) => (
              <DealCard
                key={offer.id}
                offer={offer}
                isActive={offer.id === activeOfferId}
                unreadCount={effectiveUnread(offer, unread)}
                userRole={user.role}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
