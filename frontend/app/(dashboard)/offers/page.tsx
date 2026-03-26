'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { dispatchOffersListRefresh } from '@/lib/offers-list-refresh';
import { offerStatusBadgeClassName } from '@/lib/offer-status-badge';
import type { OfferListItem, OfferStatus } from '@/lib/types/offer';
import GlobalHeader from '@/components/layout/GlobalHeader';

import KanbanBoard from './KanbanBoard';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Нова',
  IN_REVIEW: 'На розгляді',
  COUNTER_OFFER: 'Контрпропозиція',
  ACCEPTED: 'Прийнято',
  REJECTED: 'Відхилено',
  AWAITING_DELIVERY: 'Очікує доставки',
  DELIVERED: 'Доставлено',
  ARCHIVED: 'Архів',
};

const ALL_STATUSES: OfferStatus[] = [
  'NEW',
  'IN_REVIEW',
  'COUNTER_OFFER',
  'ACCEPTED',
  'REJECTED',
  'AWAITING_DELIVERY',
  'DELIVERED',
];
const TERMINAL_STATUSES = ['DELIVERED', 'REJECTED'];

function getOfferProductNames(offer: OfferListItem): string {
  if (!offer.items || offer.items.length === 0) return '—';
  const first = offer.items[0].sku?.name ?? offer.items[0].productName ?? '—';
  if (offer.items.length === 1) return first;
  return `${first} +${offer.items.length - 1}`;
}

export default function OffersPage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [counterpartySearch, setCounterpartySearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'acceptedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const isBuyer = user?.role === 'BUYER';
  const counterpartyLabel = isBuyer ? 'Постачальник' : 'Закупник';

  const loadOffers = useCallback(() => {
    const api = getAuthApiClient();
    const params: Record<string, string> = {
      showArchived: String(showArchived),
      sortBy,
      sortOrder,
    };
    if (statusFilter.length > 0) params.status = statusFilter.join(',');
    if (counterpartySearch.trim()) params.counterpartyName = counterpartySearch.trim();

    const requests: Promise<void>[] = [
      api
        .get<OfferListItem[]>('/offers', { params })
        .then((r) => {
          if (isBuyer) {
            setOffers(r.data.filter((o) => o.initiatorRole !== 'BUYER'));
          } else {
            setOffers(r.data);
          }
        }),
    ];

    if (isBuyer) {
      requests.push(
        api
          .get<OfferListItem[]>('/buyer/orders')
          .then((r) => setBuyerOrders(r.data)),
      );
    }

    return Promise.all(requests).catch(() => undefined);
  }, [showArchived, sortBy, sortOrder, statusFilter, counterpartySearch, isBuyer]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    loadOffers()
      ?.catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false));
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || !user) return;
    loadOffers();
  }, [statusFilter, counterpartySearch, showArchived, sortBy, sortOrder]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const allOffers = isBuyer ? [...offers, ...buyerOrders] : offers;
    const ids = allOffers.map((o) => o.id);
    if (ids.length === 0) return;
    getAuthApiClient()
      .get<Record<string, number>>('/offers/unread-counts', {
        params: { ids: ids.join(',') },
      })
      .then((r) => setUnread(r.data))
      .catch(() => undefined);
  }, [offers, buyerOrders, isBuyer]);

  const handleMarkDelivered = (offerId: string): void => {
    setActionInProgress(offerId);
    getAuthApiClient()
      .patch(`/offers/${offerId}/status/delivered`)
      .then(() => {
        toast.success('Доставку підтверджено!');
        loadOffers();
      })
      .catch(() => toast.error('Не вдалося підтвердити доставку'))
      .finally(() => setActionInProgress(null));
  };

  const handleArchive = (offerId: string): void => {
    setActionInProgress(offerId);
    getAuthApiClient()
      .patch(`/offers/${offerId}/archive`)
      .then(() => {
        toast.success('Статус архівації змінено');
        loadOffers();
        dispatchOffersListRefresh();
      })
      .catch(() => toast.error('Не вдалося архівувати'))
      .finally(() => setActionInProgress(null));
  };

  const toggleStatusFilter = (status: string): void => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  if (!user) return <div />;

  return (
    <>
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Угоди</h1>
        <p className="mt-1 text-muted-foreground">
          {isBuyer
            ? 'Усі вхідні пропозиції та створені вами замовлення.'
            : 'Усі ваші пропозиції та переговорні.'}
        </p>

        {loading && (
          <div className="mt-6 flex justify-center py-12">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Filters */}
            <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Фільтри та сортування</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    {counterpartyLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="Пошук за назвою..."
                    value={counterpartySearch}
                    onChange={(e) => setCounterpartySearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Сортувати за</label>
                  <div className="flex gap-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'acceptedAt')}
                      className="rounded-md bg-background border border-input px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="createdAt">Дата створення</option>
                      <option value="acceptedAt">Дата погодження</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted/50"
                      title={sortOrder === 'asc' ? 'За зростанням' : 'За спаданням'}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="bg-background"
                  />
                  Показати архівні
                </label>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Статус</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatusFilter(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                        statusFilter.includes(s)
                          ? isBuyer
                            ? 'border-success bg-success text-success-foreground'
                            : 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                  {statusFilter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter([])}
                      className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                    >
                      Скинути
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Empty state for Vendor */}
            {!isBuyer && offers.length === 0 && (
              <div className="mt-8 rounded-lg border border-border bg-muted p-8 text-center">
                <p className="text-muted-foreground">Поки немає пропозицій.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Створіть пропозицію — потім відкрийте переговорну для переговорів із закупником.
                </p>
              </div>
            )}

            {isBuyer ? (
              <KanbanBoard
                offers={[...offers, ...buyerOrders]}
                unread={unread}
                actionInProgress={actionInProgress}
                onMarkDelivered={handleMarkDelivered}
                onArchive={handleArchive}
              />
            ) : (
              <>
                {offers.length > 0 && (
                  <OffersTable
                    title="Ваші пропозиції"
                    offers={offers}
                    unread={unread}
                    userRole={user.role}
                    actionInProgress={actionInProgress}
                    onArchive={handleArchive}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
    </>
  );
}

function OffersTable({
  title,
  offers,
  unread,
  userRole,
  actionInProgress,
  onMarkDelivered,
  onArchive,
}: {
  title: string;
  offers: OfferListItem[];
  unread: Record<string, number>;
  userRole: AuthUser['role'];
  actionInProgress: string | null;
  onMarkDelivered?: (id: string) => void;
  onArchive: (id: string) => void;
}): JSX.Element {
  const isBuyer = userRole === 'BUYER';

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
      <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground">
        {title}
      </h2>
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Товар
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              {isBuyer ? 'Постачальник' : 'Закупник'}
            </th>
            {!isBuyer && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Доставка
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Статус
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
              Дія
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {offers.map((offer) => (
            <tr
              key={offer.id}
              className={`hover:bg-muted ${offer.isArchived ? 'opacity-60' : ''}`}
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                {getOfferProductNames(offer)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {isBuyer
                  ? offer.vendor.companyName
                  : offer.buyer?.companyName ?? '—'}
              </td>
              {!isBuyer && (
                <td
                  className="max-w-[180px] truncate px-4 py-3 text-sm text-muted-foreground"
                  title={offer.deliveryTerms ?? undefined}
                >
                  {offer.deliveryTerms || '—'}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3">
                <span className={offerStatusBadgeClassName(offer.status)}>
                  {STATUS_LABELS[offer.status] ?? offer.status}
                </span>
                {offer.isArchived && (
                  <span className="ml-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Архів
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {onMarkDelivered && offer.status === 'AWAITING_DELIVERY' && (
                    <button
                      type="button"
                      onClick={() => onMarkDelivered(offer.id)}
                      disabled={actionInProgress === offer.id}
                      className="rounded-md bg-success px-2.5 py-1.5 text-xs font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
                      title="Підтвердити доставку"
                    >
                      {actionInProgress === offer.id ? '…' : 'Доставлено'}
                    </button>
                  )}
                  {TERMINAL_STATUSES.includes(offer.status) && (
                    <button
                      type="button"
                      onClick={() => onArchive(offer.id)}
                      disabled={actionInProgress === offer.id}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title={offer.isArchived ? 'Розархівувати' : 'Архівувати'}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    </button>
                  )}
                  <a
                    href={`/offers/${offer.id}`}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Переговорна
                    {unread[offer.id] ? (
                      <span className="ml-2 inline-flex min-w-[20px] justify-center rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
                        {unread[offer.id]}
                      </span>
                    ) : null}
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
