'use client';

import { useEffect, useState } from 'react';
import { getAuthApiClient } from '@/lib/api-client';
import type { AuthUser } from '@/lib/auth';
import type { OfferDetail } from '@/lib/types/offer';

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
  const [proposePrice, setProposePrice] = useState('');
  const [actionLoading, setActionLoading] = useState<'accept' | 'propose' | 'reject' | 'reschedule' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const api = getAuthApiClient();

  const fetchOffer = (): void => {
    setLoading(true);
    setError(null);
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
  }, [offerId, initialOffer?.id]);

  useEffect(() => {
    if (initialOffer == null && offerId) fetchOffer();
  }, [offerId]);

  const isMyTurn =
    !!offer && (currentUser.role === 'BUYER' ? offer.currentTurn === 'BUYER' : offer.currentTurn === 'VENDOR');

  const isClosed = offer && (offer.status === 'ACCEPTED' || offer.status === 'REJECTED');
  const isAwaitingDelivery = offer && offer.status === 'AWAITING_DELIVERY';

  const mergeOfferUpdate = (updated: Partial<OfferDetail>): void => {
    setOffer((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const handleAccept = (): void => {
    if (!offer || isClosed || !isMyTurn) return;
    setActionError(null);
    setActionLoading('accept');
    api
      .post<OfferDetail>(`/offers/${offerId}/accept`)
      .then((res) => {
        mergeOfferUpdate(res.data);
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося прийняти умови';
        setActionError(typeof msg === 'string' ? msg : msg.join(', '));
      })
      .finally(() => setActionLoading(null));
  };

  const handlePropose = (): void => {
    if (!offer || isClosed || !isMyTurn || !proposePrice.trim()) return;
    setActionError(null);
    setActionLoading('propose');
    api
      .post<OfferDetail>(`/offers/${offerId}/propose`, { newPrice: proposePrice.trim() })
      .then((res) => {
        mergeOfferUpdate(res.data);
        setProposePrice('');
        onOfferUpdated?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'Не вдалося запропонувати ціну';
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
    api
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

  const handleReschedule = (): void => {
    if (!offer || !isAwaitingDelivery || !newDeliveryDate) return;
    setActionError(null);
    setActionLoading('reschedule');
    api
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
      <aside className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="mt-3 h-6 w-3/4 rounded bg-gray-100" />
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="mt-3 h-8 w-full rounded bg-gray-100" />
        </div>
      </aside>
    );
  }

  if (error || !offer) {
    return (
      <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4">
      {/* Картка контрагента — як у макеті: іконка кошика, підпис "Закупник/Постачальник", ім'я */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{counterpartLabel}</p>
            <p className="mt-0.5 font-semibold text-gray-900">{oppositeParty.companyName}</p>
            <p className="text-sm text-gray-500">{oppositeParty.name}</p>
          </div>
        </div>
      </div>

      {/* Текущі умови — ціна контрагента, сітка умов */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Поточні умови</h2>

        <div className="mt-3 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Поточна пропозиція</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{offer.currentPrice} грн/{offer.unit}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 border-t border-gray-100 pt-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Обʼєм (на місяць)</dt>
            <dd className="font-medium text-gray-900">{offer.volume.toLocaleString('uk-UA')} {offer.unit}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Відстрочка платежу</dt>
            <dd className="font-medium text-gray-900">за домовленістю</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Логістика</dt>
            <dd className="font-medium text-gray-900">{offer.deliveryTerms ?? 'за домовленістю'}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Дата доставки</dt>
            <dd className="font-medium text-gray-900">
              {offer.deliveryDate ? new Date(offer.deliveryDate).toLocaleDateString('uk-UA') : 'Не вказано'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Дії: прийняти умови або запропонувати свою ціну */}
      {(!isClosed && !isAwaitingDelivery) && (
        <div className="flex flex-col gap-3">
          {actionError && (
            <p className="text-xs text-red-600" role="alert">
              {actionError}
            </p>
          )}
          {(currentUser.role === 'BUYER' ? offer.currentTurn !== 'BUYER' : offer.currentTurn !== 'VENDOR') ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {currentUser.role === 'BUYER'
                ? (offer.currentTurn === 'VENDOR' ? 'На розгляді у постачальника' : 'Очікуємо відповідь закупника')
                : (offer.currentTurn === 'BUYER' ? 'На розгляді у закупника' : 'Очікуємо відповідь постачальника')}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {actionLoading === 'accept' ? 'Приймаємо…' : `Прийняти умови (${offer.currentPrice} грн)`}
              </button>
              <p className="text-center text-xs text-gray-500">або</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Своя ціна..."
                  value={proposePrice}
                  onChange={(e) => setProposePrice(e.target.value)}
                  disabled={actionLoading !== null}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50"
                />
                <span className="flex items-center px-2 text-sm text-gray-500">грн</span>
                <button
                  type="button"
                  onClick={handlePropose}
                  disabled={actionLoading !== null || !proposePrice.trim()}
                  className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                >
                  {actionLoading === 'propose' ? '…' : 'Запропонувати'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
              >
                {actionLoading === 'reject' ? 'Відхиляємо угоду…' : 'Відхилити угоду з причиною'}
              </button>
            </>
          )}
        </div>
      )}

      {isClosed && !isAwaitingDelivery && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-600">
          Угоду закрито. Дії недоступні.
        </div>
      )}

      {isAwaitingDelivery && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm text-emerald-800 font-medium">
            Угоду погоджено. Очікується доставка.
          </div>
          
          {!isRescheduleOpen ? (
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(true)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Змінити дату доставки
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Нова дата доставки</h3>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleReschedule}
                  disabled={!newDeliveryDate || actionLoading === 'reschedule'}
                  className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading === 'reschedule' ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
              {actionError && (
                <p className="mt-2 text-xs text-red-600">{actionError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
