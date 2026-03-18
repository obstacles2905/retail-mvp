'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import type { OfferListItem } from '@/lib/types/offer';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Нова',
  IN_REVIEW: 'На розгляді',
  COUNTER_OFFER: 'Контрпропозиція',
  ACCEPTED: 'Прийнято',
  REJECTED: 'Відхилено',
};

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

export default function VendorDashboardPage(): JSX.Element {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [connections, setConnections] = useState<LinkedBuyer[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [offerType, setOfferType] = useState<'catalog' | 'own'>('own');
  const [createSkuId, setCreateSkuId] = useState('');
  const [createProductName, setCreateProductName] = useState('');
  const [createPrice, setCreatePrice] = useState('');
  const [createVolume, setCreateVolume] = useState('');
  const [createUnit, setCreateUnit] = useState('item');
  const [createDeliveryTerms, setCreateDeliveryTerms] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const skusForSelectedBuyer = selectedBuyerId
    ? skus.filter((s) => s.createdById === selectedBuyerId || s.createdBy?.id === selectedBuyerId)
    : [];

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
    const catalogOk = offerType === 'catalog' && createSkuId.trim();
    const ownOk = offerType === 'own' && selectedBuyerId && createProductName.trim();
    if (!hasPrice || (!catalogOk && !ownOk)) return;
    setCreateError(null);
    setCreateLoading(true);
    const api = getAuthApiClient();
    const body: Record<string, unknown> = {
      currentPrice: createPrice.trim(),
      volume: createVolume.trim(),
      unit: createUnit,
      deliveryTerms: createDeliveryTerms.trim() || undefined,
    };
    if (offerType === 'catalog') body.skuId = createSkuId;
    else body.buyerId = selectedBuyerId;
    if (offerType === 'own') body.productName = createProductName.trim();

    api
      .post<OfferListItem>('/offers', body)
      .then(() => {
        setSelectedBuyerId('');
        setOfferType('own');
        setCreateSkuId('');
        setCreateProductName('');
        setCreatePrice('');
        setCreateVolume('');
        setCreateUnit('item');
        setCreateDeliveryTerms('');
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

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ← В кабінет
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Кабінет постачальника</h1>
        <p className="mt-1 text-gray-600">
          Ваші пропозиції та переговорні. Створіть пропозицію за товарами закупників, до яких ви підключені.
        </p>

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
          <>
            {/* Підключені закупники */}
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Підключені закупники</h2>
              {connections.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  Поки немає. Перейдіть за посиланням-запрошенням від закупника, щоб зареєструватися та підключитися.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {connections.map((c) => (
                    <li key={c.buyerId} className="text-sm text-gray-700">
                      <span className="font-medium">{c.buyerCompanyName}</span>
                      {c.buyerName && <span className="text-gray-500"> — {c.buyerName}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Створити пропозицію */}
            {connections.length > 0 && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900">Створити пропозицію</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Оберіть закупника. Можна запропонувати товар з його каталогу (SKU) або свій товар — закупник побачить пропозицію в переговорній.
                </p>
                <form onSubmit={handleCreateOffer} className="mt-4 space-y-4">
                  {createError && (
                    <div className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">
                      {createError}
                    </div>
                  )}
                  <div>
                    <label htmlFor="vendor-buyer" className="block text-xs font-medium text-gray-700">
                      Закупник (кому пропозиція)
                    </label>
                    <select
                      id="vendor-buyer"
                      value={selectedBuyerId}
                      onChange={(e) => {
                        setSelectedBuyerId(e.target.value);
                        setCreateSkuId('');
                      }}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Оберіть закупника</option>
                      {connections.map((c) => (
                        <option key={c.buyerId} value={c.buyerId}>
                          {c.buyerCompanyName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-700">Тип пропозиції</span>
                    <div className="mt-1 flex gap-4">
                      <label className="inline-flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name="offerType"
                          checked={offerType === 'own'}
                          onChange={() => { setOfferType('own'); setCreateSkuId(''); }}
                        />
                        Свій товар (назву вводите ви)
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name="offerType"
                          checked={offerType === 'catalog'}
                          onChange={() => { setOfferType('catalog'); setCreateProductName(''); }}
                        />
                        Товар з каталогу закупника
                      </label>
                    </div>
                  </div>
                  {offerType === 'own' ? (
                    <div>
                      <label htmlFor="vendor-product-name" className="block text-xs font-medium text-gray-700">
                        Назва товару
                      </label>
                      <input
                        id="vendor-product-name"
                        type="text"
                        value={createProductName}
                        onChange={(e) => setCreateProductName(e.target.value)}
                        placeholder="Наприклад: Молоко 2,5% 1 л"
                        required={offerType === 'own'}
                        maxLength={500}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="vendor-sku" className="block text-xs font-medium text-gray-700">
                        Товар (SKU) закупника
                      </label>
                      <select
                        id="vendor-sku"
                        value={createSkuId}
                        onChange={(e) => setCreateSkuId(e.target.value)}
                        required={offerType === 'catalog'}
                        disabled={!selectedBuyerId || skusForSelectedBuyer.length === 0}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                      >
                        <option value="">
                          {!selectedBuyerId
                            ? 'Спочатку оберіть закупника'
                            : skusForSelectedBuyer.length === 0
                              ? 'У цього закупника поки немає товарів у каталозі'
                              : 'Оберіть SKU'}
                        </option>
                        {skusForSelectedBuyer.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.targetPrice ? ` (цільова: ${s.targetPrice} грн)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <div className="w-28">
                      <label htmlFor="vendor-price" className="block text-xs font-medium text-gray-700">
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
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="w-24">
                      <label htmlFor="vendor-volume" className="block text-xs font-medium text-gray-700">
                        Об'єм
                      </label>
                      <input
                        id="vendor-volume"
                        type="text"
                        inputMode="numeric"
                        value={createVolume}
                        onChange={(e) => setCreateVolume(e.target.value)}
                        placeholder="100"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="w-36">
                      <label htmlFor="vendor-unit" className="block text-xs font-medium text-gray-700">
                        Од. виміру
                      </label>
                      <select
                        id="vendor-unit"
                        value={createUnit}
                        onChange={(e) => setCreateUnit(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <optgroup label="Штучний">
                          <option value="item">Штука (item)</option>
                        </optgroup>
                        <optgroup label="Вага">
                          <option value="mg">Міліграм (mg)</option>
                          <option value="g">Грам (g)</option>
                          <option value="kg">Кілограм (kg)</option>
                        </optgroup>
                        <optgroup label="Об'єм">
                          <option value="ml">Мілілітр (ml)</option>
                          <option value="cl">Сантилітр (cl)</option>
                          <option value="L">Літр (L)</option>
                          <option value="m³">Куб. метр (m³)</option>
                        </optgroup>
                        <optgroup label="Розмір">
                          <option value="mm">Міліметр (mm)</option>
                          <option value="cm">Сантиметр (cm)</option>
                          <option value="m">Метр (m)</option>
                        </optgroup>
                        <optgroup label="Площа">
                          <option value="m²">Кв. метр (m²)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="vendor-delivery" className="block text-xs font-medium text-gray-700">
                      Терміни та умови доставки
                    </label>
                    <textarea
                      id="vendor-delivery"
                      rows={2}
                      value={createDeliveryTerms}
                      onChange={(e) => setCreateDeliveryTerms(e.target.value)}
                      placeholder="Наприклад: 5–7 робочих днів, самовивіз зі складу"
                      maxLength={2000}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createLoading ? 'Створення…' : 'Створити пропозицію'}
                  </button>
                </form>
              </div>
            )}

            {!loading && connections.length > 0 && skus.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                У закупників поки немає товарів у каталозі — створіть пропозицію «Свій товар» вище.
              </p>
            )}

            {/* Список пропозицій */}
            {offers.length === 0 ? (
              <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">У вас поки немає пропозицій.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Створіть пропозицію вище — потім відкрийте переговорну для переговорів із закупником.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
                  Ваші пропозиції
                </h2>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Товар
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Закупник
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Ціна
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Об'єм
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Доставка
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Статус
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Дія
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {offer.sku.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {offer.buyer?.companyName ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {offer.currentPrice} грн
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                          {offer.volume} {offer.unit}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-600" title={offer.deliveryTerms ?? undefined}>
                          {offer.deliveryTerms || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {STATUS_LABELS[offer.status] ?? offer.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/offers/${offer.id}`}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Переговорна
                            {unread[offer.id] ? (
                              <span className="ml-2 inline-flex min-w-[20px] justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                                {unread[offer.id]}
                              </span>
                            ) : null}
                          </Link>
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
