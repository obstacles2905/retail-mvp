'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthApiClient } from '@/lib/api-client';
import { dispatchOffersListRefresh } from '@/lib/offers-list-refresh';
import type { AuthUser } from '@/lib/auth';
import type { OfferDetail, OfferItemDetail } from '@/lib/types/offer';

interface DealSidebarProps {
  offerId: string;
  currentUser: AuthUser;
  initialOffer?: OfferDetail | null;
  onOfferUpdated?: () => void;
}

export function DealSidebar({
  offerId,
  currentUser,
  initialOffer,
  onOfferUpdated,
}: DealSidebarProps): JSX.Element {
  const [offer, setOffer] = useState<OfferDetail | null>(initialOffer ?? null);
  const [loading, setLoading] = useState(!initialOffer);
  const [error, setError] = useState<string | null>(null);
  const [proposePrices, setProposePrices] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<'accept' | 'propose' | 'reject' | 'reschedule' | 'deliver' | 'archive' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const fetchOffer = (): void => {
    setLoading(true);
    setError(null);
    const api = getAuthApiClient();
    api
      .get<OfferDetail>(`/offers/${offerId}`)
      .then((res) => setOffer(res.data))
      .catch((err) => {
        const msg =
          err.response?.data?.message ??
          (err.response?.status === 403 ? 'Немає доступу до цієї угоди' : 'Не вдалося завантажити угоду');
        setError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (initialOffer != null) {
      setOffer(initialOffer);
      setLoading(false);
      return;
    }
    fetchOffer();
  }, [offerId, initialOffer?.updatedAt]);

  const isMyTurn =
    !!offer && (currentUser.role === 'BUYER' ? offer.currentTurn === 'BUYER' : offer.currentTurn === 'VENDOR');

  const isClosed = offer && (offer.status === 'ACCEPTED' || offer.status === 'REJECTED' || offer.status === 'DELIVERED');
  const isAwaitingDelivery = offer && offer.status === 'AWAITING_DELIVERY';
  const isDelivered = offer && offer.status === 'DELIVERED';
  const canArchive = offer && (offer.status === 'DELIVERED' || offer.status === 'REJECTED');

  const mergeOfferUpdate = (updated: Partial<OfferDetail>): void => {
    setOffer((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const hasProposedPrices = Object.values(proposePrices).some(v => v.trim());

  const handleAccept = (): void => {
    if (!offer || isClosed || !isMyTurn) return;
    setActionError(null);
    setActionLoading('accept');
    getAuthApiClient()
      .post<OfferDetail>(`/offers/${offerId}/accept`)
      .then((res) => {
        mergeOfferUpdate(res.data);
        setIsAcceptModalOpen(false);
        setIsSuccessModalOpen(true);
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося прийняти умови';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handlePropose = (): void => {
    if (!offer || isClosed || !isMyTurn || !hasProposedPrices) return;
    const items = Object.entries(proposePrices)
      .filter(([, price]) => price.trim())
      .map(([itemId, newPrice]) => ({ itemId, newPrice: newPrice.trim() }));
    if (items.length === 0) return;

    setActionError(null);
    setActionLoading('propose');
    getAuthApiClient()
      .post<OfferDetail>(`/offers/${offerId}/propose`, { items })
      .then((res) => {
        mergeOfferUpdate(res.data);
        setProposePrices({});
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося запропонувати ціни';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handleReject = (): void => {
    if (!offer || offer.status === 'REJECTED' || offer.status === 'ACCEPTED' || offer.status === 'AWAITING_DELIVERY') return;
    const reason = window.prompt('Вкажіть причину відмови від угоди:');
    if (!reason || !reason.trim()) return;
    setActionError(null);
    setActionLoading('reject');
    getAuthApiClient()
      .post<OfferDetail>(`/offers/${offerId}/reject`, { reason: reason.trim() })
      .then((res) => {
        mergeOfferUpdate(res.data);
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося відхилити угоду';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handleDeliver = (): void => {
    if (!offer || offer.status !== 'AWAITING_DELIVERY' || currentUser.role !== 'BUYER') return;
    setActionError(null);
    setActionLoading('deliver');
    getAuthApiClient()
      .patch<OfferDetail>(`/offers/${offerId}/status/delivered`)
      .then((res) => {
        mergeOfferUpdate(res.data);
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося підтвердити доставку';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handleArchive = (): void => {
    if (!offer) return;
    setActionError(null);
    setActionLoading('archive');
    getAuthApiClient()
      .patch<OfferDetail>(`/offers/${offerId}/archive`)
      .then((res) => {
        mergeOfferUpdate(res.data);
        onOfferUpdated?.();
        dispatchOffersListRefresh();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося архівувати';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handleReschedule = (): void => {
    if (!offer || !isAwaitingDelivery || !newDeliveryDate) return;
    setActionError(null);
    setActionLoading('reschedule');
    getAuthApiClient()
      .post<OfferDetail>(`/offers/${offerId}/reschedule`, { deliveryDate: new Date(newDeliveryDate).toISOString() })
      .then((res) => {
        mergeOfferUpdate(res.data);
        setIsRescheduleOpen(false);
        setNewDeliveryDate('');
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося змінити дату доставки';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  if (loading) {
    return (
      <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col gap-4 border-l border-border bg-card p-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="mt-3 h-6 w-3/4 rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-3 h-8 w-full rounded bg-muted" />
        </div>
      </aside>
    );
  }

  if (error || !offer) {
    return (
      <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col border-l border-border bg-card p-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? 'Угоду не знайдено'}
        </div>
      </aside>
    );
  }

  const oppositeParty =
    currentUser.role === 'BUYER'
      ? { name: offer.vendor?.name ?? '—', companyName: offer.vendor?.companyName ?? '—' }
      : offer.buyer
        ? { name: offer.buyer.name, companyName: offer.buyer.companyName }
        : { name: '—', companyName: '—' };

  const counterpartLabel = currentUser.role === 'BUYER' ? 'Постачальник' : 'Закупник';
  const items = offer.items ?? [];

  return (
    <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col border-l border-border bg-card overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{counterpartLabel}</p>
              <p className="mt-0.5 font-semibold text-foreground">{oppositeParty.companyName}</p>
              <p className="text-sm text-muted-foreground">{oppositeParty.name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Товари та ціни</h2>

          <div className="mt-3 space-y-3 overflow-y-auto max-h-[calc(49vh)]">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                proposePrice={proposePrices[item.id] ?? ''}
                onProposePriceChange={(val) => setProposePrices(prev => ({ ...prev, [item.id]: val }))}
                showPriceInput={!isClosed && !isAwaitingDelivery && isMyTurn}
                disabled={actionLoading !== null}
              />
            ))}
          </div>

          <dl className="mt-4 grid gap-2 border-t border-border pt-3">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Логістика</dt>
              <dd className="font-medium text-foreground">{offer.deliveryTerms ?? 'за домовленістю'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Дата доставки</dt>
              <dd className="font-medium text-foreground">
                {offer.deliveryDate ? new Date(offer.deliveryDate).toLocaleDateString('uk-UA') : 'Не вказано'}
              </dd>
            </div>
          </dl>
        </div>

        {(!isClosed && !isAwaitingDelivery) && (
          <div className="flex flex-col gap-3">
            {actionError && (
              <p className="text-xs text-destructive" role="alert">
                {actionError}
              </p>
            )}
            {!isMyTurn ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                {currentUser.role === 'BUYER'
                  ? (offer.currentTurn === 'VENDOR' ? 'На розгляді у постачальника' : 'Очікуємо відповідь закупника')
                  : (offer.currentTurn === 'BUYER' ? 'На розгляді у закупника' : 'Очікуємо відповідь постачальника')}
              </p>
            ) : (
              <>
                {!hasProposedPrices ? (
                  <button
                    type="button"
                    onClick={() => setIsAcceptModalOpen(true)}
                    disabled={actionLoading !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 font-semibold text-success-foreground shadow-sm hover:bg-success/90 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {actionLoading === 'accept' ? 'Приймаємо…' : 'Прийняти угоду'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePropose}
                    disabled={actionLoading !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {actionLoading === 'propose' ? 'Відправляємо…' : 'Запропонувати свою ціну'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading !== null}
                  className="mt-2 text-xs font-medium text-destructive hover:text-destructive/90"
                >
                  {actionLoading === 'reject' ? 'Відхиляємо угоду…' : 'Відхилити угоду з причиною'}
                </button>
              </>
            )}
          </div>
        )}

        {isDelivered && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-info/30 bg-info/10 p-4 text-center text-sm font-medium text-info">
              Доставку підтверджено.
            </div>
            {canArchive && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={actionLoading !== null}
                className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                {actionLoading === 'archive' ? '…' : (offer?.isArchived ? 'Розархівувати' : 'Архівувати угоду')}
              </button>
            )}
            {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          </div>
        )}

        {offer?.status === 'REJECTED' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm font-medium text-destructive">
              Угоду відхилено.
            </div>
            {canArchive && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={actionLoading !== null}
                className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                {actionLoading === 'archive' ? '…' : (offer?.isArchived ? 'Розархівувати' : 'Архівувати угоду')}
              </button>
            )}
            {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          </div>
        )}

        {offer?.status === 'ACCEPTED' && !isAwaitingDelivery && (
          <div className="rounded-xl border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
            Угоду закрито. Дії недоступні.
          </div>
        )}

        {isAwaitingDelivery && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-center text-sm font-medium text-success">
              Угоду погоджено. Очікується доставка.
            </div>

            {currentUser.role === 'BUYER' && (
              <button
                type="button"
                onClick={handleDeliver}
                disabled={actionLoading !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {actionLoading === 'deliver' ? 'Підтвердження…' : 'Підтвердити доставку'}
              </button>
            )}
            
            {!isRescheduleOpen ? (
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(true)}
                className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Змінити дату доставки
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-medium text-foreground">Нова дата доставки</h3>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRescheduleOpen(false)}
                    className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    disabled={!newDeliveryDate || actionLoading === 'reschedule'}
                    className="flex-1 rounded-md bg-success px-3 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
                  >
                    {actionLoading === 'reschedule' ? 'Збереження...' : 'Зберегти'}
                  </button>
                </div>
                {actionError && (
                  <p className="mt-2 text-xs text-destructive">{actionError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accept Confirmation Modal */}
      {isAcceptModalOpen && offer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Чи дійсно ви хочете підтвердити офер?</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex justify-between border-b border-border pb-2">
                <span>Товар(и):</span>
                <span className="font-medium text-foreground text-right max-w-[200px] truncate">
                  {offer.items?.map(i => i.sku?.name ?? i.productName).join(', ')}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Кількість:</span>
                <span className="font-medium text-foreground">
                  {offer.items?.map(i => `${i.volume} ${i.unit}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Сума:</span>
                <span className="font-medium text-foreground">
                  {offer.items?.reduce((sum, i) => sum + (i.volume * Number(i.currentPrice)), 0).toLocaleString('uk-UA')} грн
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Дата доставки:</span>
                <span className="font-medium text-foreground">
                  {offer.deliveryDate ? new Date(offer.deliveryDate).toLocaleDateString('uk-UA') : 'Не вказано'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Місце доставки / Логістика:</span>
                <span className="font-medium text-foreground text-right max-w-[200px]">
                  {offer.deliveryTerms ?? 'за домовленістю'}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading === 'accept'}
                className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
              >
                {actionLoading === 'accept' ? 'Підтвердження...' : 'Підтвердити'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && offer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Угоду успішно укладено!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentUser.role === 'VENDOR' ? (
                <>
                  Вам потрібно буде доставити товар <strong>{offer.items?.[0]?.sku?.name ?? offer.items?.[0]?.productName}</strong>{' '}
                </>
              ) : (
                <>
                  Очікуйте доставку товару <strong>{offer.items?.[0]?.sku?.name ?? offer.items?.[0]?.productName}</strong>{' '}
                </>
              )}
              {offer.deliveryDate ? `до ${new Date(offer.deliveryDate).toLocaleDateString('uk-UA')}` : 'у визначений термін'}{' '}
              за умовами: <strong>{offer.deliveryTerms ?? 'за домовленістю'}</strong>.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/calendar"
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Перейти до календаря поставок
              </Link>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function ItemRow({
  item,
  proposePrice,
  onProposePriceChange,
  showPriceInput,
  disabled,
}: {
  item: OfferItemDetail;
  proposePrice: string;
  onProposePriceChange: (val: string) => void;
  showPriceInput: boolean;
  disabled: boolean;
}): JSX.Element {
  const productName = item.sku?.name ?? item.productName ?? 'Товар';
  const targetPrice = item.sku?.targetPrice;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{productName}</p>
          {item.isNovelty && (
            <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning mt-0.5">
              Новий товар
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-foreground">{item.currentPrice}</span>
          <span className="ml-1 text-sm text-muted-foreground">грн/{item.unit}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {item.volume.toLocaleString('uk-UA')} {item.unit}
        </span>
      </div>
      {targetPrice && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Цільова ціна: {targetPrice} грн
        </p>
      )}
      {targetPrice && item.currentPrice < targetPrice && (
        <div className="mt-2 rounded bg-warning/10 p-2 text-[10px] text-warning border border-warning/20">
          Увага: запропонована ціна нижча за вашу цільову ціну.
        </div>
      )}
      {targetPrice && item.currentPrice > targetPrice && (
        <div className="mt-2 rounded bg-destructive/10 p-2 text-[10px] text-destructive border border-destructive/20">
          Увага: запропонована ціна вища за вашу цільову ціну.
        </div>
      )}
      {showPriceInput && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Нова ціна..."
            value={proposePrice}
            onChange={(e) => onProposePriceChange(e.target.value)}
            disabled={disabled}
            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted"
          />
          <span className="text-xs text-muted-foreground">грн</span>
        </div>
      )}
    </div>
  );
}
