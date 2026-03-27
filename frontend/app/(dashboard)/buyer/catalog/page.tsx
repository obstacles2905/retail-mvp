'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getAuthApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { CreatableCategorySelect } from '@/components/CreatableCategorySelect';

interface SkuDto {
  id: string;
  name: string;
  categoryId: string | null;
  category?: { id: string; name: string };
  uom: string;
  articleCode: string | null;
  barcode: string | null;
  targetPrice: string | null;
  isArchived: boolean;
}

export default function BuyerCatalogPage() {
  const [skus, setSkus] = useState<SkuDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uom, setUom] = useState('item');
  const [articleCode, setArticleCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCategoryId('');
    setUom('item');
    setArticleCode('');
    setBarcode('');
    setTargetPrice('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (sku: SkuDto) => {
    setName(sku.name);
    setCategoryId(sku.categoryId ?? '');
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
    if (!categoryId) {
      alert('Будь ласка, оберіть або створіть категорію');
      return;
    }
    const payload = {
      name: name.trim(),
      categoryId,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    const loadingToast = toast.loading('Імпорт товарів...');

    try {
      const res = await api.post('/skus/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { importedCount, failedCount } = res.data;
      
      toast.success(`Успішно імпортовано ${importedCount} товарів. ${failedCount > 0 ? `Помилок: ${failedCount}` : ''}`, { id: loadingToast });
      fetchSkus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при імпорті файлу', { id: loadingToast });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const headers = ['Назва', 'Категорія', 'Одиниця виміру', 'Артикул', 'Штрихкод', 'Цільова ціна'];
    const examples = [
      ['Цукор білий 1кг', 'Бакалія', 'кг', 'SUG-001', '4820000000001', '35.50'],
      ['Молоко 2.5% ПЕТ', 'Молочні продукти', 'L', 'MILK-002', '4820000000002', '42.00'],
      ['Яблука Голден', 'Фрукти та овочі', 'кг', 'FRU-003', '', '28.90'],
      ['Вода мінеральна негазована 1.5л', 'Напої', 'item', 'WAT-004', '4820000000004', '18.50'],
      ['Папір туалетний 2-шаровий (4 шт)', 'Господарські товари', 'item', 'PAP-005', '4820000000005', '65.00']
    ];
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + examples.map(row => row.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sku_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputClass =
    'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Каталог товарів (SKU)</h1>
            <p className="mt-1 text-sm text-muted-foreground">Управління вашою матрицею товарів. Ці товари будуть доступні для замовлень та пропозицій.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="rounded-md border border-primary bg-card px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                {importing ? 'Імпорт...' : 'Імпорт з Excel'}
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Завантажити шаблон
              </button>
            </div>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="h-fit rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90"
            >
              + Додати товар
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium text-foreground">{editingId ? 'Редагувати товар' : 'Новий товар'}</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-foreground">Назва товару *</label>
                <input required type="text" maxLength={200} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Категорія *</label>
                <CreatableCategorySelect
                  value={categoryId}
                  onChange={setCategoryId}
                />
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
                <input type="text" maxLength={32} value={articleCode} onChange={e => setArticleCode(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Штрихкод (Barcode)</label>
                <input type="text" maxLength={32} value={barcode} onChange={e => setBarcode(e.target.value)} className={inputClass} />
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sku.category?.name ?? '—'}</td>
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
