'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { ProductSelect } from '@/components/ProductSelect';
import { toast } from 'react-hot-toast';

interface VendorConnectionDto {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string;
}

interface OrderItemInput {
  id: number;
  product: { skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null;
  price: string;
  volume: string;
}

let nextOrderItemId = 1;

export default function BuyerDashboardPage(): JSX.Element {
  const router = useRouter();
  const [vendorConnections, setVendorConnections] = useState<VendorConnectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([{ id: nextOrderItemId++, product: null, price: '', volume: '' }]);
  const [orderDeliveryTerms, setOrderDeliveryTerms] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [orderVendorIds, setOrderVendorIds] = useState<string[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const addOrderItem = (): void => {
    setOrderItems(prev => [...prev, { id: nextOrderItemId++, product: null, price: '', volume: '' }]);
  };

  const removeOrderItem = (itemId: number): void => {
    setOrderItems(prev => prev.length > 1 ? prev.filter(i => i.id !== itemId) : prev);
  };

  const updateOrderItem = (itemId: number, updates: Partial<OrderItemInput>): void => {
    setOrderItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUserId(user.id);
    const api = getAuthApiClient();
    api
      .get<VendorConnectionDto[]>('/invites/vendor-connections')
      .then((r) => setVendorConnections(r.data))
      .catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false));
  }, [router]);

  const toggleVendor = (vendorId: string): void => {
    setOrderVendorIds((prev) => (prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]));
  };

  const createOrder = (e: React.FormEvent): void => {
    e.preventDefault();
    setOrderError(null);
    const hasVendors = orderVendorIds.length > 0;
    const allItemsValid = orderItems.every(i => i.product && i.price.trim() && i.volume.trim());
    if (!hasVendors || !allItemsValid || !orderDeliveryDate) return;

    setOrderLoading(true);
    const api = getAuthApiClient();
    const body: Record<string, unknown> = {
      deliveryTerms: orderDeliveryTerms.trim() || undefined,
      deliveryDate: new Date(orderDeliveryDate).toISOString(),
      vendorIds: orderVendorIds,
      items: orderItems.map(i => {
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
      .post('/buyer/orders', body)
      .then(() => {
        setOrderItems([{ id: nextOrderItemId++, product: null, price: '', volume: '' }]);
        setOrderDeliveryTerms('');
        setOrderDeliveryDate('');
        setOrderVendorIds([]);
        toast.success('Замовлення успішно створено та надіслано постачальникам!');
        router.push('/offers');
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

  return (
    <>
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Кабінет закупника</h1>
        <p className="mt-1 text-muted-foreground">
          Створюйте замовлення з розсилкою постачальникам із контактів.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Створити нове замовлення</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Додайте один або кілька товарів та надішліть замовлення обраним постачальникам.
              </p>
            </div>
          </div>

          <form onSubmit={createOrder} className="mt-4 space-y-4">
            {orderError && (
              <div className="rounded bg-destructive/10 p-2 text-xs text-destructive" role="alert">
                {orderError}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-foreground">Товари</label>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="text-xs font-medium text-success hover:text-success/80"
                >
                  + Додати товар
                </button>
              </div>

              {orderItems.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Товар {idx + 1}</span>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(item.id)}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Видалити
                      </button>
                    )}
                  </div>
                  {currentUserId && (
                    <ProductSelect
                      buyerId={currentUserId}
                      role="BUYER"
                      value={item.product}
                      onChange={(p) => updateOrderItem(item.id, { product: p })}
                    />
                  )}
                  {item.product && (
                    <div className="rounded bg-success/10 p-2 text-sm text-success">
                      Обрано: <strong>{item.product.productName}</strong> ({item.product.uom})
                      {item.product.targetPrice && (
                        <span className="ml-2 inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
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
                        onChange={(e) => updateOrderItem(item.id, { price: e.target.value })}
                        placeholder="0.00"
                        required
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-foreground">
                        Обʼєм ({item.product?.uom || 'од.'})
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.volume}
                        onChange={(e) => updateOrderItem(item.id, { volume: e.target.value })}
                        placeholder="100"
                        required
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
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
              {loading ? (
                <div className="mt-2 h-10 w-48 animate-pulse rounded bg-muted" />
              ) : vendorConnections.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  У вас поки немає підключених постачальників. Спочатку{' '}
                  <Link href="/profile" className="text-primary hover:text-primary/90">
                    запросіть
                  </Link>{' '}
                  їх через посилання.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {vendorConnections.map((v) => (
                    <label
                      key={v.vendorId}
                      className="flex items-center gap-2 rounded border border-border bg-muted px-3 py-2 text-sm"
                    >
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

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={orderLoading || vendorConnections.length === 0}
              className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {orderLoading ? 'Створення…' : 'Створити замовлення та надіслати'}
            </button>
          </form>
        </div>
      </div>
    </main>
    </>
  );
}
