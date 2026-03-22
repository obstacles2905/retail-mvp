'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { DealSidebar } from './DealSidebar';
import { DealChat } from './DealChat';
import type { OfferDetail } from '@/lib/types/offer';

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { noveltyBadgeClassName, offerStatusBadgeClassName } from '@/lib/offer-status-badge';
import GlobalHeader from '@/components/layout/GlobalHeader';

function getInitials(companyName: string): string {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return companyName.slice(0, 2).toUpperCase();
}

function getShortDealId(offerId: string): string {
  return `#OFF-${offerId.slice(-6).toUpperCase()}`;
}

function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  return `${baseUrl}${avatarPath}`;
}

export default function OfferNegotiationPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setMounted(true);
  }, [router]);

  const offerId = params.id as string;

  useEffect(() => {
    if (!mounted || !offerId) return;
    const api = getAuthApiClient();
    setHeaderLoading(true);
    api
      .get<OfferDetail>(`/offers/${offerId}`)
      .then((res) => setOffer(res.data))
      .catch(() => setOffer(null))
      .finally(() => setHeaderLoading(false));
  }, [mounted, offerId]);

  useEffect(() => {
    if (!mounted || !offerId) return;
    getAuthApiClient().post(`/offers/${offerId}/read`).catch(() => undefined);
  }, [mounted, offerId]);

  const refreshOffer = useCallback(() => {
    if (!offerId) return;
    getAuthApiClient()
      .get<OfferDetail>(`/offers/${offerId}`)
      .then((res) => setOffer(res.data))
      .catch(() => undefined);
  }, [offerId]);

  if (!mounted || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  const isMyTurn =
    offer &&
    (user.role === 'BUYER' ? offer.currentTurn === 'BUYER' : offer.currentTurn === 'VENDOR');
  const statusLabelMap: Record<string, string> = {
    ACCEPTED: 'Узгоджено',
    REJECTED: 'Відхилено',
    AWAITING_DELIVERY: 'Очікує доставки',
    DELIVERED: 'Доставлено',
    ARCHIVED: 'Архів',
  };
  const statusLabel = !offer ? '—' : (statusLabelMap[offer.status] ?? 'На розгляді');

  const terminalStatuses = ['ACCEPTED', 'REJECTED', 'AWAITING_DELIVERY', 'DELIVERED', 'ARCHIVED'];
  const statusHint = !offer
    ? ''
    : terminalStatuses.includes(offer.status)
      ? 'Угоду завершено'
      : user.role === 'BUYER'
        ? (offer.currentTurn === 'VENDOR' ? 'На розгляді у постачальника' : 'Очікуємо відповідь закупника')
        : (offer.currentTurn === 'BUYER' ? 'На розгляді у закупника' : 'Очікуємо відповідь постачальника');

  const dealTitle = offer
    ? offer.sku?.name ?? offer.productName ?? 'Умови угоди'
    : 'Завантаження…';

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <GlobalHeader /> 

      {/* Основний контент: ліва колонка (умови) + права (історія переговорів) */}
      <section className="flex min-h-0 flex-1">
        <div className="flex flex-row-reverse min-h-0 w-full flex-1 gap-0">
          {/* Ліва колонка — умови угоди */}
          <DealSidebar
            offerId={offerId}
            currentUser={user}
            initialOffer={offer}
            onOfferUpdated={refreshOffer}
          />

          {/* Права колонка — історія переговорів */}
          <DealChat
            offerId={offerId}
            offer={offer}
            shortDealId={offerId ? getShortDealId(offerId) : ''}
            currentUserId={user.id}
            onSystemEvent={refreshOffer}
          />
        </div>
      </section>
    </main>
  );
}
