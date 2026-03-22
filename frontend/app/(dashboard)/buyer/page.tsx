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

interface VendorConnectionDto {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string;
}

interface SkuOption {
  id: string;
  name: string;
  category: string;
  targetPrice: string | null;
}

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { noveltyBadgeClassName, offerStatusBadgeClassName } from '@/lib/offer-status-badge';
import { toast } from 'react-hot-toast';

export default function BuyerDashboardPage(): JSX.Element {
  const router = useRouter();
  const [incomingOffers, setIncomingOffers] = useState<OfferListItem[]>([]);
  const [myOrders, setMyOrders] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [vendorConnections, setVendorConnections] = useState<VendorConnectionDto[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<{ skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null>(null);
  const [orderTargetPrice, setOrderTargetPrice] = useState('');
  const [orderVolume, setOrderVolume] = useState('');
  const [orderDeliveryTerms, setOrderDeliveryTerms] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [orderVendorIds, setOrderVendorIds] = useState<string[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [counterpartySearch, setCounterpartySearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'acceptedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadOffers = (): void => {
    const api = getAuthApiClient();
    const params: Record<string, string> = {
      showArchived: String(showArchived),
      sortBy,
      sortOrder,
    };
    if (statusFilter.length > 0) params.status = statusFilter.join(',');
    if (counterpartySearch.trim()) params.counterpartyName = counterpartySearch.trim();

    Promise.all([
      api.get<OfferListItem[]>('/offers', { params }).then((r) => setIncomingOffers(r.data.filter((o) => o.initiatorRole !== 'BUYER'))),
      api.get<OfferListItem[]>('/buyer/orders').then((r) => setMyOrders(r.data)),
    ]).catch(() => undefined);
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUserId(user.id);
    const api = getAuthApiClient();
    Promise.all([
      api.get<OfferListItem[]>('/offers').then((r) => setIncomingOffers(r.data.filter((o) => o.initiatorRole !== 'BUYER'))),
      api.get<OfferListItem[]>('/buyer/orders').then((r) => setMyOrders(r.data)),
      api.get<VendorConnectionDto[]>('/invites/vendor-connections').then((r) => setVendorConnections(r.data)),
      api.get<SkuOption[]>('/skus').then((r) => setSkus(r.data)),
    ]).catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (loading) return;
    loadOffers();
  }, [statusFilter, counterpartySearch, showArchived, sortBy, sortOrder]);

  useEffect(() => {
    const api = getAuthApiClient();
    const ids = [...incomingOffers, ...myOrders].map((o) => o.id);
    if (ids.length === 0) return;
    api
      .get<Record<string, number>>(`/offers/unread-counts`, { params: { ids: ids.join(',') } })
      .then((r) => setUnread(r.data))
      .catch(() => undefined);
  }, [incomingOffers, myOrders]);

  const toggleVendor = (vendorId: string): void => {
    setOrderVendorIds((prev) => (prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]));
  };

  const createOrder = (e: React.FormEvent): void => {
    e.preventDefault();
    setOrderError(null);
    const hasVendors = orderVendorIds.length > 0;
    const hasBasics = !!orderTargetPrice.trim() && !!orderVolume.trim() && !!orderDeliveryDate;
    if (!hasVendors || !hasBasics || !selectedProduct) return;

    setOrderLoading(true);
    const api = getAuthApiClient();
    const body: Record<string, unknown> = {
      targetPrice: orderTargetPrice.trim(),
      volume: orderVolume.trim(),
      unit: selectedProduct.uom || 'item',
      deliveryTerms: orderDeliveryTerms.trim() || undefined,
      deliveryDate: new Date(orderDeliveryDate).toISOString(),
      vendorIds: orderVendorIds,
    };
    if (selectedProduct.skuId) {
      body.skuId = selectedProduct.skuId;
    } else {
      body.productName = selectedProduct.productName;
      body.category = selectedProduct.category;
    }

    api
      .post<OfferListItem[]>('/buyer/orders', body)
      .then(() => {
        setSelectedProduct(null);
        setOrderTargetPrice('');
        setOrderVolume('');
        setOrderDeliveryTerms('');
        setOrderDeliveryDate('');
        setOrderVendorIds([]);
        toast.success('Замовлення успішно створено та надіслано постачальникам!');
        return api.get<OfferListItem[]>('/buyer/orders').then((r) => setMyOrders(r.data));
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
            : null;
        setOrderError(
          typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Не вдалося створити замовлення',
        );
      })
      .finally(() => setOrderLoading(false));
  };

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

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Кабінет закупника</h1>
        <p className="mt-1 text-muted-foreground">
          Керуйте вхідними пропозиціями та створюйте власні замовлення з розсилкою постачальникам із контактів.
        </p>

        {/* Створити нове замовлення */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Створити нове замовлення</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Створіть замовлення на потрібний товар і одразу розішліть його обраним постачальникам.
              </p>
            </div>
          </div>

          <form onSubmit={createOrder} className="mt-4 space-y-4">
              {orderError && (
                <div className="rounded bg-destructive/10 p-2 text-xs text-destructive" role="alert">
                  {orderError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Товар</label>
                {currentUserId && (
                  <ProductSelect
                    buyerId={currentUserId}
                    role="BUYER"
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                  />
                )}
                {selectedProduct && (
                  <div className="mt-2 rounded bg-success/10 p-2 text-sm text-success">
                    Обрано: <strong>{selectedProduct.productName}</strong> ({selectedProduct.uom})
                    {selectedProduct.targetPrice && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        Цільова ціна: {selectedProduct.targetPrice} грн
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="w-28">
                  <label htmlFor="order-price" className="block text-xs font-medium text-foreground">
                    Ціна, грн
                  </label>
                  <input
                    id="order-price"
                    type="text"
                    inputMode="decimal"
                    value={orderTargetPrice}
                    onChange={(e) => setOrderTargetPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {selectedProduct?.targetPrice && Number(orderTargetPrice) > 0 && Number(orderTargetPrice) < Number(selectedProduct.targetPrice) && (
                    <p className="mt-1 text-[10px] text-warning leading-tight">
                      Увага: вказана ціна нижча за цільову ({selectedProduct.targetPrice} грн)
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <label htmlFor="order-volume" className="block text-xs font-medium text-foreground">
                    Об'єм ({selectedProduct?.uom || 'од.'})
                  </label>
                  <input
                    id="order-volume"
                    type="text"
                    inputMode="numeric"
                    value={orderVolume}
                    onChange={(e) => setOrderVolume(e.target.value)}
                    placeholder="100"
                    required
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="w-40">
                  <label htmlFor="order-delivery-date" className="block text-xs font-medium text-foreground">
                    Дата доставки
                  </label>
                  <input
                    id="order-delivery-date"
                    type="date"
                    value={orderDeliveryDate}
                    onChange={(e) => setOrderDeliveryDate(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="order-delivery" className="block text-xs font-medium text-foreground">
                  Терміни та умови доставки
                </label>
                <textarea
                  id="order-delivery"
                  rows={2}
                  value={orderDeliveryTerms}
                  onChange={(e) => setOrderDeliveryTerms(e.target.value)}
                  placeholder="Наприклад: доставка на РЦ, DDP, 3–5 робочих днів"
                  maxLength={2000}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-foreground">Кому надіслати</p>
                {vendorConnections.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    У вас поки немає підключених постачальників. Спочатку запросіть їх через посилання.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {vendorConnections.map((v) => (
                      <label key={v.vendorId} className="flex items-center gap-2 rounded border border-border bg-muted px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="bg-background"
                          checked={orderVendorIds.includes(v.vendorId)}
                          onChange={() => toggleVendor(v.vendorId)}
                        />
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-foreground">{v.vendorCompanyName}</span>
                          <span className="text-muted-foreground"> — {v.vendorName}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={orderLoading || vendorConnections.length === 0}
                className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
              >
                {orderLoading ? 'Створення…' : 'Створити замовлення та надіслати'}
              </button>
          </form>
        </div>

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
          <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Фільтри та сортування</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-foreground mb-1">Постачальник</label>
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
                        ? 'border-success bg-success text-success-foreground'
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
        )}

        {!loading && !error && incomingOffers.length === 0 && myOrders.length === 0 && (
          <div className="mt-8 rounded-lg border border-border bg-muted p-8 text-center">
            <p className="text-muted-foreground">Поки немає пропозицій за вашими SKU.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Постачальники зможуть надсилати пропозиції після того, як ви створите SKU (сторінка в розробці).
            </p>
          </div>
        )}

        {!loading && !error && incomingOffers.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              Вхідні пропозиції
            </h2>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Постачальник</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Об&apos;єм</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {incomingOffers.map((offer) => (
                  <tr key={offer.id} className={`hover:bg-muted ${offer.isArchived ? 'opacity-60' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {offer.sku?.name || offer.productName}
                      {offer.isNovelty && (
                        <span className={`ml-2 ${noveltyBadgeClassName}`}>
                          Запропоновано
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{offer.vendor.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">{offer.currentPrice} грн</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">{offer.volume} {offer.unit}</td>
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
                        {offer.status === 'AWAITING_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() => handleMarkDelivered(offer.id)}
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

        {!loading && !error && myOrders.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
            <h2 className="border-b border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              Створені мною замовлення
            </h2>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Товар</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Постачальник</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Об&apos;єм</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {myOrders.map((offer) => (
                  <tr key={offer.id} className={`hover:bg-muted ${offer.isArchived ? 'opacity-60' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {offer.sku?.name || offer.productName}
                      {offer.isNovelty && (
                        <span className={`ml-2 ${noveltyBadgeClassName}`}>
                          Запропоновано
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{offer.vendor.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">{offer.currentPrice} грн</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">{offer.volume} {offer.unit}</td>
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
                        {offer.status === 'AWAITING_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() => handleMarkDelivered(offer.id)}
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
      </div>
    </main>
  );
}
