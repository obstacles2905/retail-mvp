'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { OfferListItem } from '@/lib/types/offer';

import { ProductSelect } from '@/components/ProductSelect';

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

const ALL_STATUSES = ['NEW', 'IN_REVIEW', 'COUNTER_OFFER', 'ACCEPTED', 'REJECTED', 'AWAITING_DELIVERY', 'DELIVERED'] as const;
const TERMINAL_STATUSES = ['DELIVERED', 'REJECTED'];

interface LinkedBuyer {
  buyerId: string;
  buyerName: string;
  buyerCompanyName: string;
}

interface SkuOption {
  id: string;
  name: string;
  category: string;
  targetPrice: string | null;
  createdById: string;
  createdBy?: { id: string; companyName: string };
}

import { noveltyBadgeClassName, offerStatusBadgeClassName } from '@/lib/offer-status-badge';
import { toast } from 'react-hot-toast';
import GlobalHeader from '@/components/layout/GlobalHeader';

export default function VendorDashboardPage(): JSX.Element {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [connections, setConnections] = useState<LinkedBuyer[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null>(null);
  const [createPrice, setCreatePrice] = useState('');
  const [createVolume, setCreateVolume] = useState('');
  const [createDeliveryTerms, setCreateDeliveryTerms] = useState('');
  const [createDeliveryDate, setCreateDeliveryDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [counterpartySearch, setCounterpartySearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'acceptedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const skusForSelectedBuyer = selectedBuyerId
    ? skus.filter((s) => s.createdById === selectedBuyerId || s.createdBy?.id === selectedBuyerId)
    : [];

  const loadOffers = (): void => {
    const api = getAuthApiClient();
    const params: Record<string, string> = {
      showArchived: String(showArchived),
      sortBy,
      sortOrder,
    };
    if (statusFilter.length > 0) params.status = statusFilter.join(',');
    if (counterpartySearch.trim()) params.counterpartyName = counterpartySearch.trim();
    api.get<OfferListItem[]>('/offers', { params }).then((r) => setOffers(r.data)).catch(() => undefined);
  };

  const loadData = (): void => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    const api = getAuthApiClient();
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<OfferListItem[]>('/offers').then((r) => setOffers(r.data)),
      api.get<LinkedBuyer[]>('/invites/connections').then((r) => setConnections(r.data)),
      api.get<SkuOption[]>('/skus').then((r) => setSkus(r.data)),
    ])
      .catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    loadOffers();
  }, [statusFilter, counterpartySearch, showArchived, sortBy, sortOrder]);

  useEffect(() => {
    const api = getAuthApiClient();
    const ids = offers.map((o) => o.id);
    if (ids.length === 0) return;
    api
      .get<Record<string, number>>(`/offers/unread-counts`, { params: { ids: ids.join(',') } })
      .then((r) => setUnread(r.data))
      .catch(() => undefined);
  }, [offers]);

  const handleCreateOffer = (e: React.FormEvent): void => {
    e.preventDefault();
    const hasPrice = !!createPrice.trim() && !!createVolume.trim();
    if (!hasPrice || !selectedBuyerId || !selectedProduct) return;
    setCreateError(null);
    setCreateLoading(true);
    const api = getAuthApiClient();
    const body: Record<string, unknown> = {
      currentPrice: createPrice.trim(),
      volume: createVolume.trim(),
      unit: selectedProduct.uom || 'item',
      deliveryTerms: createDeliveryTerms.trim() || undefined,
      deliveryDate: new Date(createDeliveryDate).toISOString(),
    };
    if (selectedProduct.skuId) {
      body.skuId = selectedProduct.skuId;
    } else {
      body.buyerId = selectedBuyerId;
      body.productName = selectedProduct.productName;
      body.category = selectedProduct.category;
    }

    api
      .post<OfferListItem>('/offers', body)
      .then(() => {
        setSelectedBuyerId('');
        setSelectedProduct(null);
        setCreatePrice('');
        setCreateVolume('');
        setCreateDeliveryTerms('');
        setCreateDeliveryDate('');
        toast.success('Пропозицію успішно створено!');
        loadData();
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
            : null;
        setCreateError(
          typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Не вдалося створити пропозицію',
        );
      })
      .finally(() => setCreateLoading(false));
  };

  const handleArchive = (offerId: string): void => {
    setActionInProgress(offerId);
    getAuthApiClient()
      .patch(`/offers/${offerId}/archive`)
      .then(() => {
        toast.success('Статус архівації змінено');
        loadOffers();
      })
      .catch(() => toast.error('Не вдалося архівувати'))
      .finally(() => setActionInProgress(null));
  };

  const toggleStatusFilter = (status: string): void => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  return (
    <main className="flex min-h-screen flex-col">
     <GlobalHeader /> 

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Кабінет постачальника</h1>
        <p className="mt-1 text-muted-foreground">
          Ваші пропозиції та переговорні. Створіть пропозицію за товарами закупників, до яких ви підключені.
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
            {/* Підключені закупники */}
            <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Підключені закупники</h2>
              {connections.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Поки немає. Перейдіть за посиланням-запрошенням від закупника, щоб зареєструватися та підключитися.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {connections.map((c) => (
                    <li key={c.buyerId} className="text-sm text-foreground">
                      <span className="font-medium">{c.buyerCompanyName}</span>
                      {c.buyerName && <span className="text-muted-foreground"> — {c.buyerName}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Створити пропозицію */}
            {connections.length > 0 && (
              <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Створити пропозицію</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Оберіть закупника. Можна запропонувати товар з його каталогу (SKU) або свій товар — закупник побачить пропозицію в переговорній.
                </p>
                <form onSubmit={handleCreateOffer} className="mt-4 space-y-4">
                  {createError && (
                    <div className="rounded bg-destructive/10 p-2 text-xs text-destructive" role="alert">
                      {createError}
                    </div>
                  )}
                  <div>
                    <label htmlFor="vendor-buyer" className="block text-xs font-medium text-foreground">
                      Закупник (кому пропозиція)
                    </label>
                    <select
                      id="vendor-buyer"
                      value={selectedBuyerId}
                      onChange={(e) => {
                        setSelectedBuyerId(e.target.value);
                        setSelectedProduct(null);
                      }}
                      required
                      className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Оберіть закупника</option>
                      {connections.map((c) => (
                        <option key={c.buyerId} value={c.buyerId}>
                          {c.buyerCompanyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBuyerId && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Товар</label>
                      <ProductSelect
                        buyerId={selectedBuyerId}
                        role="VENDOR"
                        value={selectedProduct}
                        onChange={setSelectedProduct}
                      />
                      {selectedProduct && (
                        <div className="mt-2 rounded bg-primary/10 p-2 text-sm text-primary">
                          Обрано: <strong>{selectedProduct.productName}</strong> ({selectedProduct.uom})
                          {!selectedProduct.skuId && ' (Новий товар)'}
                          {selectedProduct.targetPrice && (
                            <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              Цільова ціна: {selectedProduct.targetPrice} грн
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <div className="w-28">
                      <label htmlFor="vendor-price" className="block text-xs font-medium text-foreground">
                        Ціна, грн
                      </label>
                      <input
                        id="vendor-price"
                        type="text"
                        inputMode="decimal"
                        value={createPrice}
                        onChange={(e) => setCreatePrice(e.target.value)}
                        placeholder="0.00"
                        required
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      {selectedProduct?.targetPrice && Number(createPrice) > 0 && Number(createPrice) < Number(selectedProduct.targetPrice) && (
                        <p className="mt-1 text-[10px] text-warning leading-tight">
                          Увага: вказана ціна нижча за цільову ({selectedProduct.targetPrice} грн)
                        </p>
                      )}
                    </div>
                    <div className="w-24">
                      <label htmlFor="vendor-volume" className="block text-xs font-medium text-foreground">
                        Об'єм ({selectedProduct?.uom || 'од.'})
                      </label>
                      <input
                        id="vendor-volume"
                        type="text"
                        inputMode="numeric"
                        value={createVolume}
                        onChange={(e) => setCreateVolume(e.target.value)}
                        placeholder="100"
                        required
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="w-40">
                      <label htmlFor="vendor-delivery-date" className="block text-xs font-medium text-foreground">
                        Дата доставки
                      </label>
                      <input
                        id="vendor-delivery-date"
                        type="date"
                        value={createDeliveryDate}
                        onChange={(e) => setCreateDeliveryDate(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="vendor-delivery" className="block text-xs font-medium text-foreground">
                      Терміни та умови доставки
                    </label>
                    <textarea
                      id="vendor-delivery"
                      rows={2}
                      value={createDeliveryTerms}
                      onChange={(e) => setCreateDeliveryTerms(e.target.value)}
                      placeholder="Наприклад: 5–7 робочих днів, самовивіз зі складу"
                      maxLength={2000}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createLoading ? 'Створення…' : 'Створити пропозицію'}
                  </button>
                </form>
              </div>
            )}

            {!loading && connections.length > 0 && skus.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                У закупників поки немає товарів у каталозі — створіть пропозицію «Свій товар» вище.
              </p>
            )}

            <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Фільтри та сортування</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-foreground mb-1">Закупник</label>
                  <input
                    type="text"
                    placeholder="Пошук за назвою..."
                    value={counterpartySearch}
                    onChange={(e) => setCounterpartySearch(e.target.value)}
                    className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="bg-background" />
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
                          ? 'border-primary bg-primary text-primary-foreground'
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

            {offers.length === 0 ? (
              <div className="mt-8 rounded-lg border border-border bg-muted p-8 text-center">
                <p className="text-muted-foreground">У вас поки немає пропозицій.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Створіть пропозицію вище — потім відкрийте переговорну для переговорів із закупником.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
                <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground">
                  Ваші пропозиції
                </h2>
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Товар</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Закупник</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Ціна</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Об&apos;єм</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Доставка</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Статус</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Дія</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {offers.map((offer) => (
                      <tr key={offer.id} className={`hover:bg-muted ${offer.isArchived ? 'opacity-60' : ''}`}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                          {offer.sku?.name || offer.productName}
                          {offer.isNovelty && (
                            <span className={`ml-2 ${noveltyBadgeClassName}`}>
                              Ваша пропозиція
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{offer.buyer?.companyName ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">{offer.currentPrice} грн</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">{offer.volume} {offer.unit}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-sm text-muted-foreground" title={offer.deliveryTerms ?? undefined}>
                          {offer.deliveryTerms || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={offerStatusBadgeClassName(offer.status)}>
                            {STATUS_LABELS[offer.status] ?? offer.status}
                          </span>
                          {offer.isArchived && (
                            <span className="ml-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Архів</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {TERMINAL_STATUSES.includes(offer.status) && (
                              <button
                                type="button"
                                onClick={() => handleArchive(offer.id)}
                                disabled={actionInProgress === offer.id}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                                title={offer.isArchived ? 'Розархівувати' : 'Архівувати'}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
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
            )}
          </>
        )}
      </div>
    </main>
  );
}
