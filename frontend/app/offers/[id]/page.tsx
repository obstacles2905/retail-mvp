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
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
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
    <main className="flex min-h-screen flex-col bg-[#f5f5f5]">
      {/* Хедер як у макету: лого, назва угоди по центру, статус, юзер */}
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="text-sm font-medium">Переговорна</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            {headerLoading ? (
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-center text-sm font-semibold text-gray-900 sm:text-base">
                    {dealTitle}
                  </h1>
                  {offer?.isNovelty && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Запропоновано
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      offer?.status === 'DELIVERED'
                        ? 'bg-blue-100 text-blue-800'
                        : offer?.status === 'ACCEPTED' || offer?.status === 'AWAITING_DELIVERY'
                          ? 'bg-green-100 text-green-800'
                          : offer?.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  {statusHint && (
                    <span className="mt-0.5 text-[11px] leading-4 text-gray-500">{statusHint}</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            {getAvatarUrl(user.avatarPath) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarUrl(user.avatarPath)!}
                alt="Avatar"
                className="h-8 w-8 rounded-full object-cover border border-gray-200"
                title={user.companyName}
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
                title={user.companyName}
              >
                {getInitials(user.companyName)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Основний контент: ліва колонка (умови) + права (історія переговорів) */}
      <section className="flex flex-1 overflow-hidden">
        <div className="flex w-full gap-0 overflow-hidden">
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
