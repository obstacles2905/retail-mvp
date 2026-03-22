'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthApiClient } from '@/lib/api-client';
import { SUPERMARKET_CATEGORIES } from '@/lib/constants';

interface SkuDto {
  id: string;
  name: string;
  category: string;
  uom: string;
  articleCode: string | null;
  barcode: string | null;
  targetPrice: string | null;
  isArchived: boolean;
}

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function BuyerCatalogPage() {
  const [skus, setSkus] = useState<SkuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(SUPERMARKET_CATEGORIES[0]);
  const [uom, setUom] = useState('item');
  const [articleCode, setArticleCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

  const api = getAuthApiClient();

  const fetchSkus = () => {
    setLoading(true);
    api.get<SkuDto[]>('/skus')
      .then(res => setSkus(res.data))
      .catch(() => setError('Не вдалося завантажити каталог'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSkus();
  }, []);

  const resetForm = () => {
    setName('');
    setCategory(SUPERMARKET_CATEGORIES[0]);
    setUom('item');
    setArticleCode('');
    setBarcode('');
    setTargetPrice('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (sku: SkuDto) => {
    setName(sku.name);
    setCategory(sku.category);
    setUom(sku.uom);
    setArticleCode(sku.articleCode ?? '');
    setBarcode(sku.barcode ?? '');
    setTargetPrice(sku.targetPrice ?? '');
    setEditingId(sku.id);
    setShowForm(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете архівувати цей товар?')) return;
    try {
      await api.patch(`/skus/${id}/archive`);
      fetchSkus();
    } catch (err) {
      alert('Помилка при архівуванні');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      category: category.trim(),
      uom,
      articleCode: articleCode.trim() || undefined,
      barcode: barcode.trim() || undefined,
      targetPrice: targetPrice.trim() || undefined,
    };

    try {
      if (editingId) {
        await api.put(`/skus/${editingId}`, payload);
      } else {
        await api.post('/skus', payload);
      }
      resetForm();
      fetchSkus();
    } catch (err) {
      alert('Помилка при збереженні товару');
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationBell />
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Каталог товарів (SKU)</h1>
            <p className="mt-1 text-sm text-muted-foreground">Управління вашою матрицею товарів. Ці товари будуть доступні для замовлень та пропозицій.</p>
          </div>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90"
          >
            + Додати товар
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium text-foreground">{editingId ? 'Редагувати товар' : 'Новий товар'}</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-foreground">Назва товару *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Категорія *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                  {SUPERMARKET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Од. виміру *</label>
                <select required value={uom} onChange={e => setUom(e.target.value)} className={inputClass}>
                  <optgroup label="Штучний"><option value="item">Штука (item)</option><option value="box">Ящик (box)</option><option value="pallet">Палета (pallet)</option></optgroup>
                  <optgroup label="Вага"><option value="g">Грам (g)</option><option value="kg">Кілограм (kg)</option><option value="t">Тонна (t)</option></optgroup>
                  <optgroup label="Об'єм"><option value="ml">Мілілітр (ml)</option><option value="L">Літр (L)</option></optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Цільова ціна (грн)</label>
                <input type="number" step="0.01" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Артикул (внутрішній)</label>
                <input type="text" value={articleCode} onChange={e => setArticleCode(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Штрихкод (Barcode)</label>
                <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className={inputClass} />
              </div>

              <div className="mt-2 flex justify-end gap-3 sm:col-span-2 lg:col-span-3">
                <button type="button" onClick={resetForm} className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
                  Скасувати
                </button>
                <button type="submit" className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90">
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>
        ) : skus.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            Каталог порожній. Додайте свій перший товар.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Назва</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Категорія</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Од. вим.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Артикул / Штрихкод</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Цільова ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {skus.map((sku) => (
                  <tr key={sku.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{sku.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sku.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sku.uom}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {sku.articleCode && <div className="text-xs">Арт: {sku.articleCode}</div>}
                      {sku.barcode && <div className="text-xs">ШК: {sku.barcode}</div>}
                      {!sku.articleCode && !sku.barcode && <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{sku.targetPrice ? `${sku.targetPrice} грн` : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <button type="button" onClick={() => handleEdit(sku)} className="mr-4 text-primary hover:text-primary/80">Ред.</button>
                      <button type="button" onClick={() => handleArchive(sku.id)} className="text-destructive hover:text-destructive/80">Архів</button>
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
