'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Package, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { OfferListItem, OfferStatus } from '@/lib/types/offer';

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
  NEW: 'text-info',
  IN_REVIEW: 'text-warning',
  COUNTER_OFFER: 'text-warning',
  ACCEPTED: 'text-success',
  REJECTED: 'text-destructive',
  AWAITING_DELIVERY: 'text-primary',
  DELIVERED: 'text-success',
  ARCHIVED: 'text-muted-foreground',
};

function getCounterpartyName(offer: OfferListItem, role: AuthUser['role']): string {
  if (role === 'BUYER') return offer.vendor.companyName;
  return offer.buyer?.companyName ?? '—';
}

function getProductName(offer: OfferListItem): string {
  return offer.sku?.name ?? offer.productName ?? '—';
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {getProductName(offer)}
          </span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {getCounterpartyName(offer, userRole)}
        </p>
        <span className={cn('text-xs font-medium', STATUS_COLORS[offer.status])}>
          {STATUS_LABELS[offer.status]}
        </span>
      </div>
    </Link>
  );
}

export function DealSidebar(): JSX.Element | null {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
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
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    fetchOffers();
  }, [mounted, user, fetchOffers]);

  useEffect(() => {
    if (offers.length === 0) return;
    const ids = offers.map((o) => o.id);
    getAuthApiClient()
      .get<Record<string, number>>('/offers/unread-counts', {
        params: { ids: ids.join(',') },
      })
      .then((r) => setUnread(r.data))
      .catch(() => undefined);
  }, [offers]);

  if (!mounted || !user) return null;

  const activeOfferId = pathname.startsWith('/offers/')
    ? pathname.split('/')[2]
    : null;

  const createHref = user.role === 'BUYER' ? '/buyer' : '/vendor';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 h-14">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Активні угоди
        </h2>
        <Link
          href={createHref}
          prefetch={false}
          title="Створити нову угоду"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Link>
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
                unreadCount={unread[offer.id] ?? 0}
                userRole={user.role}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
