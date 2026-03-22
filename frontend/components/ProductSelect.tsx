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
  value: { skuId?: string; productName?: string; category?: string; uom?: string } | null;
  onChange: (val: { skuId?: string; productName?: string; category?: string; uom?: string } | null) => void;
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
  const api = getAuthApiClient();

  useEffect(() => {
    if (value?.skuId) {
      // If a value is already selected, we don't necessarily need to fetch it unless we want to display its name.
      // Assuming the parent component passes the initial state correctly or we just show "Selected".
      // For simplicity, we'll rely on the user typing to search.
    }
  }, [value]);

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
      api.get<SkuOption[]>(`/skus/search`, { params: { q: query, buyerId } })
        .then(res => setOptions(res.data))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, buyerId, isOpen, api]);

  const handleSelectSku = (sku: SkuOption) => {
    onChange({ skuId: sku.id, productName: sku.name, uom: sku.uom });
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
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-800">Запропонувати новий товар</span>
          <button type="button" onClick={cancelNovelty} className="text-xs text-gray-500 hover:text-gray-700">Скасувати</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700">Назва</label>
            <input type="text" value={noveltyName} onChange={e => setNoveltyName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Категорія</label>
            <select value={noveltyCategory} onChange={e => setNoveltyCategory(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              {SUPERMARKET_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Од. виміру</label>
            <select value={noveltyUom} onChange={e => setNoveltyUom(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <optgroup label="Штучний"><option value="item">Штука (item)</option><option value="box">Ящик (box)</option></optgroup>
              <optgroup label="Вага"><option value="g">Грам (g)</option><option value="kg">Кілограм (kg)</option></optgroup>
              <optgroup label="Об'єм"><option value="ml">Мілілітр (ml)</option><option value="L">Літр (L)</option></optgroup>
            </select>
          </div>
        </div>
        <button type="button" onClick={confirmNovelty} disabled={!noveltyName.trim() || !noveltyCategory.trim()} className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
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
        className={`block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'
        }`}
      />
      
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Пошук...</div>
          ) : options.length > 0 ? (
            <>
              {options.map((sku) => (
                <button
                  key={sku.id}
                  type="button"
                  onClick={() => handleSelectSku(sku)}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                >
                  <div className="font-medium text-gray-900">{sku.name}</div>
                  <div className="text-xs text-gray-500">{sku.category} • {sku.uom}</div>
                </button>
              ))}
              {role === 'VENDOR' && query.trim() && (
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={startNoveltyMode}
                    className="w-full text-left px-4 py-2 text-emerald-600 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                  >
                    + Запропонувати новий товар "{query}"
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              Нічого не знайдено.
              {role === 'VENDOR' && query.trim() && (
                <button
                  type="button"
                  onClick={startNoveltyMode}
                  className="mt-2 block w-full rounded-md bg-emerald-50 px-3 py-2 text-center text-emerald-700 hover:bg-emerald-100"
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
