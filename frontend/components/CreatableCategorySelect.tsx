'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuthApiClient } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
}

interface CreatableCategorySelectProps {
  value: string; // This is the categoryId
  onChange: (categoryId: string) => void;
  className?: string;
}

export function CreatableCategorySelect({ value, onChange, className }: CreatableCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = getAuthApiClient();
    setLoading(true);
    api.get<Category[]>('/categories')
      .then((res) => {
        setCategories(res.data);
      })
      .catch((err) => console.error('Failed to load categories', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    
    setCreating(true);
    try {
      const api = getAuthApiClient();
      const res = await api.post<Category>('/categories', { name: inputValue.trim() });
      
      const newCategory = res.data;
      // Update local state if it's not already there
      setCategories((prev) => {
        if (!prev.find(c => c.id === newCategory.id)) {
          return [...prev, newCategory];
        }
        return prev;
      });
      
      onChange(newCategory.id);
      setInputValue('');
      setOpen(false);
    } catch (err) {
      console.error('Failed to create category', err);
    } finally {
      setCreating(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === value);

  const filteredCategories = categories.filter((c) => 
    c.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatchExists = categories.some(
    (c) => c.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={cn("truncate", !selectedCategory && "text-muted-foreground")}>
          {selectedCategory ? selectedCategory.name : "Оберіть категорію..."}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="sticky top-0 z-10 bg-popover p-2">
            <input
              type="text"
              placeholder="Пошук категорії..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <div className="p-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Завантаження...</div>
            ) : (
              <>
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onChange(category.id);
                      setOpen(false);
                      setInputValue('');
                    }}
                    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {value === category.id && <Check className="h-4 w-4" />}
                    </span>
                    {category.name}
                  </button>
                ))}
                
                {inputValue.trim() && !exactMatchExists && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm text-primary outline-none hover:bg-accent hover:text-primary focus:bg-accent focus:text-primary disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Створити &quot;{inputValue}&quot;
                  </button>
                )}
                
                {filteredCategories.length === 0 && !inputValue.trim() && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Категорій не знайдено.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
