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

interface InviteDto {
  id: string;
  token: string;
  inviteUrl: string;
  usedByVendorId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

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
import { toast } from 'react-hot-toast';

export default function BuyerDashboardPage(): JSX.Element {
  const router = useRouter();
  const [incomingOffers, setIncomingOffers] = useState<OfferListItem[]>([]);
  const [myOrders, setMyOrders] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [myInvite, setMyInvite] = useState<{ token: string; inviteUrl: string } | null>(null);
  const [vendorConnections, setVendorConnections] = useState<VendorConnectionDto[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      api.get<{ token: string; inviteUrl: string }>('/invites/mine').then((r) => setMyInvite(r.data)),
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

  const createInvite = (): void => {
    const api = getAuthApiClient();
    setCreatingInvite(true);
    api
      .get<{ token: string; inviteUrl: string }>('/invites/mine')
      .then((res) => setMyInvite(res.data))
      .catch(() => setError('Не вдалося отримати запрошення'))
      .finally(() => setCreatingInvite(false));
  };

  const copyLink = (url: string, id: string): void => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/calendar" prefetch={false} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Календар
            </Link>
            <Link
              href="/dashboard"
              prefetch={false}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Кабінет закупника</h1>
        <p className="mt-1 text-gray-600">
          Керуйте вхідними пропозиціями та створюйте власні замовлення з розсилкою постачальникам із контактів.
        </p>

        {/* Створити нове замовлення */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Створити нове замовлення</h2>
              <p className="mt-1 text-xs text-gray-600">
                Створіть замовлення на потрібний товар і одразу розішліть його обраним постачальникам.
              </p>
            </div>
          </div>

          <form onSubmit={createOrder} className="mt-4 space-y-4">
              {orderError && (
                <div className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">
                  {orderError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Товар</label>
                {currentUserId && (
                  <ProductSelect
                    buyerId={currentUserId}
                    role="BUYER"
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                  />
                )}
                {selectedProduct && (
                  <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded">
                    Обрано: <strong>{selectedProduct.productName}</strong> ({selectedProduct.uom})
                    {selectedProduct.targetPrice && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Цільова ціна: {selectedProduct.targetPrice} грн
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="w-28">
                  <label htmlFor="order-price" className="block text-xs font-medium text-gray-700">
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {selectedProduct?.targetPrice && Number(orderTargetPrice) > 0 && Number(orderTargetPrice) < Number(selectedProduct.targetPrice) && (
                    <p className="mt-1 text-[10px] text-amber-600 leading-tight">
                      Увага: вказана ціна нижча за цільову ({selectedProduct.targetPrice} грн)
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <label htmlFor="order-volume" className="block text-xs font-medium text-gray-700">
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="w-40">
                  <label htmlFor="order-delivery-date" className="block text-xs font-medium text-gray-700">
                    Дата доставки
                  </label>
                  <input
                    id="order-delivery-date"
                    type="date"
                    value={orderDeliveryDate}
                    onChange={(e) => setOrderDeliveryDate(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="order-delivery" className="block text-xs font-medium text-gray-700">
                  Терміни та умови доставки
                </label>
                <textarea
                  id="order-delivery"
                  rows={2}
                  value={orderDeliveryTerms}
                  onChange={(e) => setOrderDeliveryTerms(e.target.value)}
                  placeholder="Наприклад: доставка на РЦ, DDP, 3–5 робочих днів"
                  maxLength={2000}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700">Кому надіслати</p>
                {vendorConnections.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">
                    У вас поки немає підключених постачальників. Спочатку запросіть їх через посилання.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {vendorConnections.map((v) => (
                      <label key={v.vendorId} className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={orderVendorIds.includes(v.vendorId)}
                          onChange={() => toggleVendor(v.vendorId)}
                        />
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-gray-900">{v.vendorCompanyName}</span>
                          <span className="text-gray-500"> — {v.vendorName}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={orderLoading || vendorConnections.length === 0}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {orderLoading ? 'Створення…' : 'Створити замовлення та надіслати'}
              </button>
          </form>
        </div>

        {/* Блок запрошення постачальника */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Запросити постачальника</h2>
          <p className="mt-1 text-xs text-gray-600">
            Надішліть це посилання постачальнику (наприклад, по пошті або в месенджері). За посиланням він зареєструється та отримає доступ до ваших SKU для створення пропозицій.
          </p>
          
          {myInvite ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
              <code className="truncate flex-1 text-gray-700" title={myInvite.inviteUrl}>
                {myInvite.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => copyLink(myInvite.inviteUrl, myInvite.token)}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                {copiedId === myInvite.token ? 'Скопійовано' : 'Копіювати'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={createInvite}
              disabled={creatingInvite}
              className="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingInvite ? 'Отримання…' : 'Отримати посилання-запрошення'}
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-6 flex justify-center py-12">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Фільтри та сортування</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">Постачальник</label>
                <input
                  type="text"
                  placeholder="Пошук за назвою..."
                  value={counterpartySearch}
                  onChange={(e) => setCounterpartySearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Сортувати за</label>
                <div className="flex gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'acceptedAt')}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="createdAt">Дата створення</option>
                    <option value="acceptedAt">Дата погодження</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    title={sortOrder === 'asc' ? 'За зростанням' : 'За спаданням'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Показати архівні
              </label>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Статус</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      statusFilter.includes(s)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
                {statusFilter.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter([])}
                    className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
                  >
                    Скинути
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && incomingOffers.length === 0 && myOrders.length === 0 && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">Поки немає пропозицій за вашими SKU.</p>
            <p className="mt-1 text-sm text-gray-500">
              Постачальники зможуть надсилати пропозиції після того, як ви створите SKU (сторінка в розробці).
            </p>
          </div>
        )}

        {!loading && !error && incomingOffers.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              Вхідні пропозиції
            </h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Постачальник</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Об&apos;єм</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {incomingOffers.map((offer) => (
                  <tr key={offer.id} className={`hover:bg-gray-50 ${offer.isArchived ? 'opacity-60' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {offer.sku?.name || offer.productName}
                      {offer.isNovelty && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Запропоновано
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{offer.vendor.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">{offer.currentPrice} грн</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{offer.volume} {offer.unit}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        offer.status === 'DELIVERED' ? 'bg-blue-100 text-blue-800' :
                        offer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        offer.status === 'AWAITING_DELIVERY' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_LABELS[offer.status] ?? offer.status}
                      </span>
                      {offer.isArchived && (
                        <span className="ml-1 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Архів</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {offer.status === 'AWAITING_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() => handleMarkDelivered(offer.id)}
                            disabled={actionInProgress === offer.id}
                            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                            className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            title={offer.isArchived ? 'Розархівувати' : 'Архівувати'}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}
                        <a
                          href={`/offers/${offer.id}`}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Переговорна
                          {unread[offer.id] ? (
                            <span className="ml-2 inline-flex min-w-[20px] justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
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
          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              Створені мною замовлення
            </h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Товар</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Постачальник</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Об&apos;єм</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {myOrders.map((offer) => (
                  <tr key={offer.id} className={`hover:bg-gray-50 ${offer.isArchived ? 'opacity-60' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {offer.sku?.name || offer.productName}
                      {offer.isNovelty && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Запропоновано
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{offer.vendor.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">{offer.currentPrice} грн</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{offer.volume} {offer.unit}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        offer.status === 'DELIVERED' ? 'bg-blue-100 text-blue-800' :
                        offer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        offer.status === 'AWAITING_DELIVERY' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_LABELS[offer.status] ?? offer.status}
                      </span>
                      {offer.isArchived && (
                        <span className="ml-1 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Архів</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {offer.status === 'AWAITING_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() => handleMarkDelivered(offer.id)}
                            disabled={actionInProgress === offer.id}
                            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                            className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            title={offer.isArchived ? 'Розархівувати' : 'Архівувати'}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}
                        <a
                          href={`/offers/${offer.id}`}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Переговорна
                          {unread[offer.id] ? (
                            <span className="ml-2 inline-flex min-w-[20px] justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
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
