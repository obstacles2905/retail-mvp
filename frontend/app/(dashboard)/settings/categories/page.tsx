'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthApiClient } from '@/lib/api-client';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { SUPERMARKET_CATEGORIES } from '@/lib/constants';

interface CategoryDto {
  id: string;
  name: string;
  skuCount: number;
}

export default function CategoriesSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-defined categories modal
  const [isPredefinedModalOpen, setIsPredefinedModalOpen] = useState(false);

  const api = getAuthApiClient();

  const fetchCategories = () => {
    setLoading(true);
    api.get<CategoryDto[]>('/categories')
      .then(res => setCategories(res.data))
      .catch(() => setError('Не вдалося завантажити категорії'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    if (stored.role !== 'BUYER') {
      router.replace('/dashboard');
      return;
    }
    setUser(stored);
    fetchCategories();
  }, [router]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: CategoryDto) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, { name: categoryName });
        toast.success('Категорію оновлено');
      } else {
        await api.post('/categories', { name: categoryName });
        toast.success('Категорію створено');
      }
      closeModal();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при збереженні категорії');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, skuCount: number) => {
    if (skuCount > 0) return; // Button should be disabled anyway, but double check
    
    if (!confirm('Ви впевнені, що хочете видалити цю категорію?')) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Категорію видалено');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при видаленні категорії');
    }
  };

  const handleAddPredefined = async (name: string) => {
    try {
      await api.post('/categories', { name });
      toast.success(`Категорію "${name}" додано`);
      fetchCategories();
    } catch (err) {
      toast.error('Помилка при додаванні категорії');
    }
  };

  if (!user) return null;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Довідник категорій</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Управління категоріями товарів для вашої компанії.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsPredefinedModalOpen(true)}
              className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              Стандартні категорії
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90"
            >
              <Plus className="h-4 w-4" />
              Створити категорію
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Назва
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Кількість SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      У вас ще немає жодної категорії. Створіть першу!
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                        {category.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          {category.skuCount} товарів
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditModal(category)}
                            className="text-primary hover:text-primary/80"
                            title="Редагувати"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          
                          <div className="relative group">
                            <button
                              onClick={() => handleDelete(category.id, category.skuCount)}
                              disabled={category.skuCount > 0}
                              className="text-destructive hover:text-destructive/80 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={category.skuCount > 0 ? "" : "Видалити"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {category.skuCount > 0 && (
                              <div className="absolute bottom-full right-0 mb-2 hidden w-max rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                                Неможливо видалити категорію з товарами
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingCategory ? 'Редагувати категорію' : 'Нова категорія'}
              </h2>
              <button type="button" onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="categoryName" className="block text-sm font-medium text-foreground mb-2">
                  Назва категорії
                </label>
                <input
                  id="categoryName"
                  type="text"
                  required
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Наприклад: Овочі та фрукти"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !categoryName.trim()}
                  className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Predefined Categories Modal */}
      {isPredefinedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-foreground">
                Стандартні категорії
              </h2>
              <button type="button" onClick={() => setIsPredefinedModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Швидко додайте популярні категорії супермаркетів до вашого довідника.
              </p>
              <div className="space-y-2">
                {SUPERMARKET_CATEGORIES.map((cat) => {
                  const exists = categories.some(c => c.name.toLowerCase() === cat.toLowerCase());
                  return (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30">
                      <span className="text-sm font-medium text-foreground">{cat}</span>
                      {exists ? (
                        <span className="text-xs text-muted-foreground">Вже додано</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddPredefined(cat)}
                          className="text-xs font-medium text-primary hover:text-primary/80"
                        >
                          + Додати
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsPredefinedModalOpen(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
