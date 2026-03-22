'use client';

import { useState, useEffect, useRef } from 'react';
import { getAuthApiClient } from '@/lib/api-client';
import { SUPERMARKET_CATEGORIES } from '@/lib/constants';

export interface SkuOption {
  id: string;
  name: string;
  category: string;
  uom: string;
  targetPrice: string | null;
}

export interface ProductSelectProps {
  buyerId: string;
  role: 'BUYER' | 'VENDOR';
  value: { skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null;
  onChange: (val: { skuId?: string; productName?: string; category?: string; uom?: string; targetPrice?: string | null } | null) => void;
  error?: boolean;
}

export function ProductSelect({ buyerId, role, value, onChange, error }: ProductSelectProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isNoveltyMode, setIsNoveltyMode] = useState(false);

  const [noveltyName, setNoveltyName] = useState('');
  const [noveltyCategory, setNoveltyCategory] = useState(SUPERMARKET_CATEGORIES[0]);
  const [noveltyUom, setNoveltyUom] = useState('item');

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOptions([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const api = getAuthApiClient();
      api.get<SkuOption[]>(`/skus/search`, { params: { q: query, buyerId } })
        .then(res => setOptions(res.data))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, buyerId, isOpen]);

  const handleSelectSku = (sku: SkuOption) => {
    onChange({ skuId: sku.id, productName: sku.name, uom: sku.uom, targetPrice: sku.targetPrice });
    setQuery(sku.name);
    setIsOpen(false);
    setIsNoveltyMode(false);
  };

  const startNoveltyMode = () => {
    setNoveltyName(query);
    setIsNoveltyMode(true);
    setIsOpen(false);
  };

  const confirmNovelty = () => {
    if (!noveltyName.trim() || !noveltyCategory.trim()) return;
    onChange({
      productName: noveltyName.trim(),
      category: noveltyCategory.trim(),
      uom: noveltyUom,
    });
    setQuery(noveltyName);
    setIsNoveltyMode(false);
  };

  const cancelNovelty = () => {
    setIsNoveltyMode(false);
    onChange(null);
    setQuery('');
  };

  if (isNoveltyMode) {
    return (
      <div className="rounded-md border border-success/30 bg-success/10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-success">Запропонувати новий товар</span>
          <button type="button" onClick={cancelNovelty} className="text-xs text-muted-foreground hover:text-foreground">Скасувати</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-foreground">Назва</label>
            <input type="text" value={noveltyName} onChange={e => setNoveltyName(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">Категорія</label>
            <select value={noveltyCategory} onChange={e => setNoveltyCategory(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground">
              {SUPERMARKET_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">Од. виміру</label>
            <select value={noveltyUom} onChange={e => setNoveltyUom(e.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground">
              <optgroup label="Штучний"><option value="item">Штука (item)</option><option value="box">Ящик (box)</option></optgroup>
              <optgroup label="Вага"><option value="g">Грам (g)</option><option value="kg">Кілограм (kg)</option></optgroup>
              <optgroup label="Об'єм"><option value="ml">Мілілітр (ml)</option><option value="L">Літр (L)</option></optgroup>
            </select>
          </div>
        </div>
        <button type="button" onClick={confirmNovelty} disabled={!noveltyName.trim() || !noveltyCategory.trim()} className="mt-3 w-full rounded-md bg-success px-3 py-1.5 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50">
          Підтвердити товар
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (value) onChange(null); // clear selection if typing
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Почніть вводити назву товару..."
        className={`block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 ${
          error ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'focus:border-ring focus:ring-ring'
        }`}
      />
      
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-base text-popover-foreground shadow-lg sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">Пошук...</div>
          ) : options.length > 0 ? (
            <>
              {options.map((sku) => (
                <button
                  key={sku.id}
                  type="button"
                  onClick={() => handleSelectSku(sku)}
                  className="w-full px-4 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                >
                  <div className="font-medium text-foreground">{sku.name}</div>
                  <div className="text-xs text-muted-foreground">{sku.category} • {sku.uom}</div>
                </button>
              ))}
              {role === 'VENDOR' && query.trim() && (
                <div className="mt-1 border-t border-border pt-1">
                  <button
                    type="button"
                    onClick={startNoveltyMode}
                    className="w-full px-4 py-2 text-left text-success hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    + Запропонувати новий товар "{query}"
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              Нічого не знайдено.
              {role === 'VENDOR' && query.trim() && (
                <button
                  type="button"
                  onClick={startNoveltyMode}
                  className="mt-2 block w-full rounded-md bg-success/10 px-3 py-2 text-center text-success hover:bg-success/20"
                >
                  Запропонувати "{query}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
