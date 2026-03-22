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

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f5f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              ← В кабінет
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Каталог товарів (SKU)</h1>
            <p className="mt-1 text-sm text-gray-500">Управління вашою матрицею товарів. Ці товари будуть доступні для замовлень та пропозицій.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Додати товар
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium mb-4">{editingId ? 'Редагувати товар' : 'Новий товар'}</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Назва товару *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Категорія *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  {SUPERMARKET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Од. виміру *</label>
                <select required value={uom} onChange={e => setUom(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <optgroup label="Штучний"><option value="item">Штука (item)</option><option value="box">Ящик (box)</option><option value="pallet">Палета (pallet)</option></optgroup>
                  <optgroup label="Вага"><option value="g">Грам (g)</option><option value="kg">Кілограм (kg)</option><option value="t">Тонна (t)</option></optgroup>
                  <optgroup label="Об'єм"><option value="ml">Мілілітр (ml)</option><option value="L">Літр (L)</option></optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Цільова ціна (грн)</label>
                <input type="number" step="0.01" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Артикул (внутрішній)</label>
                <input type="text" value={articleCode} onChange={e => setArticleCode(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Штрихкод (Barcode)</label>
                <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
                <button type="button" onClick={resetForm} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Скасувати
                </button>
                <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" /></div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        ) : skus.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-500">
            Каталог порожній. Додайте свій перший товар.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Назва</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Категорія</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Од. вим.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Артикул / Штрихкод</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Цільова ціна</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {skus.map((sku) => (
                  <tr key={sku.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{sku.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{sku.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{sku.uom}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sku.articleCode && <div className="text-xs">Арт: {sku.articleCode}</div>}
                      {sku.barcode && <div className="text-xs">ШК: {sku.barcode}</div>}
                      {!sku.articleCode && !sku.barcode && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{sku.targetPrice ? `${sku.targetPrice} грн` : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <button onClick={() => handleEdit(sku)} className="text-indigo-600 hover:text-indigo-900 mr-4">Ред.</button>
                      <button onClick={() => handleArchive(sku.id)} className="text-red-600 hover:text-red-900">Архів</button>
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
