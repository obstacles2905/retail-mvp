'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { ProductSelect } from '@/components/ProductSelect';
import { toast } from 'react-hot-toast';
import GlobalHeader from '@/components/layout/GlobalHeader';

interface LinkedBuyer {
  buyerId: string;
  buyerName: string;
  buyerCompanyName: string;
}

interface OfferItemInput {
  id: number;
  product: { skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null;
  price: string;
  volume: string;
}

let nextItemId = 1;

export default function VendorDashboardPage(): JSX.Element {
  const router = useRouter();
  const [connections, setConnections] = useState<LinkedBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [createItems, setCreateItems] = useState<OfferItemInput[]>([{ id: nextItemId++, product: null, price: '', volume: '' }]);
  const [createDeliveryTerms, setCreateDeliveryTerms] = useState('');
  const [createDeliveryDate, setCreateDeliveryDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const addItem = (): void => {
    setCreateItems(prev => [...prev, { id: nextItemId++, product: null, price: '', volume: '' }]);
  };

  const removeItem = (itemId: number): void => {
    setCreateItems(prev => prev.length > 1 ? prev.filter(i => i.id !== itemId) : prev);
  };

  const updateItem = (itemId: number, updates: Partial<OfferItemInput>): void => {
    setCreateItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    const api = getAuthApiClient();
    api
      .get<LinkedBuyer[]>('/invites/connections')
      .then((r) => setConnections(r.data))
      .catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateOffer = (e: React.FormEvent): void => {
    e.preventDefault();
    const allItemsValid = createItems.every(i => i.product && i.price.trim() && i.volume.trim());
    if (!allItemsValid || !selectedBuyerId || !createDeliveryDate) return;

    setCreateError(null);
    setCreateLoading(true);
    const api = getAuthApiClient();
    const body: Record<string, unknown> = {
      buyerId: selectedBuyerId,
      deliveryTerms: createDeliveryTerms.trim() || undefined,
      deliveryDate: new Date(createDeliveryDate).toISOString(),
      items: createItems.map(i => {
        const item: Record<string, unknown> = {
          currentPrice: i.price.trim(),
          volume: i.volume.trim(),
          unit: i.product?.uom || 'item',
        };
        if (i.product?.skuId) {
          item.skuId = i.product.skuId;
        } else {
          item.productName = i.product?.productName;
          item.category = i.product?.category;
        }
        return item;
      }),
    };

    api
      .post('/offers', body)
      .then(() => {
        setSelectedBuyerId('');
        setCreateItems([{ id: nextItemId++, product: null, price: '', volume: '' }]);
        setCreateDeliveryTerms('');
        setCreateDeliveryDate('');
        toast.success('Пропозицію успішно створено!');
        router.push('/offers');
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
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Кабінет постачальника</h1>
        <p className="mt-1 text-muted-foreground">
          Створіть пропозицію за товарами закупників, до яких ви підключені.
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

            {connections.length > 0 && (
              <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Створити пропозицію</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Оберіть закупника та додайте товари. Можна запропонувати кілька товарів в одній пропозиції.
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
                        setCreateItems([{ id: nextItemId++, product: null, price: '', volume: '' }]);
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-foreground">Товари</label>
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-xs font-medium text-primary hover:text-primary/80"
                        >
                          + Додати товар
                        </button>
                      </div>

                      {createItems.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Товар {idx + 1}</span>
                            {createItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-destructive hover:text-destructive/80"
                              >
                                Видалити
                              </button>
                            )}
                          </div>
                          <ProductSelect
                            buyerId={selectedBuyerId}
                            role="VENDOR"
                            value={item.product}
                            onChange={(p) => updateItem(item.id, { product: p })}
                          />
                          {item.product && (
                            <div className="rounded bg-primary/10 p-2 text-sm text-primary">
                              Обрано: <strong>{item.product.productName}</strong> ({item.product.uom})
                              {!item.product.skuId && ' (Новий товар)'}
                              {item.product.targetPrice && (
                                <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                                  Цільова ціна: {item.product.targetPrice} грн
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3">
                            <div className="w-28">
                              <label className="block text-xs font-medium text-foreground">Ціна, грн</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, { price: e.target.value })}
                                placeholder="0.00"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              {item.product?.targetPrice && Number(item.price) > 0 && Number(item.price) < Number(item.product.targetPrice) && (
                                <p className="mt-1 text-[10px] text-warning leading-tight">
                                  Нижча за цільову ({item.product.targetPrice} грн)
                                </p>
                              )}
                            </div>
                            <div className="w-24">
                              <label className="block text-xs font-medium text-foreground">
                                Обʼєм ({item.product?.uom || 'од.'})
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={item.volume}
                                onChange={(e) => updateItem(item.id, { volume: e.target.value })}
                                placeholder="100"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
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
          </>
        )}
      </div>
    </main>
  );
}
