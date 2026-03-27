'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import axios, { type AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

import { getAuthApiClient } from '@/lib/api-client';
import { AvatarImage } from '@/components/AvatarImage';
import {
  type AuthUser,
  getStoredToken,
  getStoredUser,
  setAuth,
} from '@/lib/auth';

import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import GlobalHeader from '@/components/layout/GlobalHeader';

type UserMe = AuthUser;

export default function ProfilePage(): JSX.Element {
  const api = useMemo(() => getAuthApiClient(), []);
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<UserMe>('/users/me')
      .then((res) => {
        setUser(res.data);
        setName(res.data.name);
        setCompanyName(res.data.companyName);
        setPhone((res.data.phone ?? '').toString());
      })
      .catch(() => setError('Не вдалося завантажити профіль'))
      .finally(() => setLoading(false));
  }, [api]);

  const persistUser = (updated: UserMe): void => {
    const token = getStoredToken();
    if (!token) return;
    setAuth({ accessToken: token, user: updated });
  };

  const resetDraftFromUser = (u: UserMe): void => {
    setName(u.name);
    setCompanyName(u.companyName);
    setPhone((u.phone ?? '').toString());
  };

  const saveProfile = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!user) return;
    setSaveError(null);
    setSaving(true);
    api
      .patch<UserMe>('/users/me', {
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim() === '' ? null : phone.trim(),
      })
      .then((res) => {
        setUser(res.data);
        persistUser(res.data);
        toast.success('Зміни успішно збережено');
        setIsEditMode(false);
      })
      .catch(() => toast.error('Не вдалося зберегти зміни'))
      .finally(() => setSaving(false));
  };

  const cancelEdit = (): void => {
    if (!user) return;
    resetDraftFromUser(user);
    setSaveError(null);
    setIsEditMode(false);
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    if (!user) return;
    const maxBytes = 5 * 1024 * 1024;
    const allowedMime = ['image/png', 'image/jpeg', 'image/webp'];
    if (file.size > maxBytes) {
      toast.error('Файл завеликий. Максимум 5 МБ.');
      return;
    }
    const mime = file.type.split(';')[0].trim().toLowerCase();
    if (!allowedMime.includes(mime)) {
      toast.error('Дозволено лише PNG, JPG або WebP.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const { data } = await api.get<{ uploadUrl: string; fileKey: string }>('/files/avatar-upload-url', {
        params: { fileName: file.name, fileType: mime },
      });
      await axios.put(data.uploadUrl, file, { headers: { 'Content-Type': mime } });
      const res = await api.patch<UserMe>('/users/me/avatar', { fileKey: data.fileKey });
      setUser(res.data);
      persistUser(res.data);
      toast.success('Аватар успішно оновлено');
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.status === 503
          ? 'Завантаження тимчасово недоступне (S3 не налаштовано).'
          : 'Не вдалося завантажити аватар';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const changePassword = (e: React.FormEvent): void => {
    e.preventDefault();
    setChangePasswordError(null);

    const trimmedCurrent = currentPassword;
    const trimmedNew = newPassword;
    const trimmedConfirm = confirmNewPassword;

    if (trimmedNew !== trimmedConfirm) {
      setChangePasswordError('Підтвердження пароля не співпадає');
      return;
    }

    setChangingPassword(true);
    api
      .post<{ ok: true }>('/users/me/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
        confirmNewPassword: trimmedConfirm,
      })
      .then(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        toast.success('Пароль успішно змінено');
      })
      .catch((err: unknown) => {
        const fallback = 'Не вдалося змінити пароль';
        const axiosErr = err as AxiosError<unknown>;
        const status = axiosErr.response?.status;
        const data = axiosErr.response?.data;

        if (status === 401) {
          setChangePasswordError('Невірний поточний пароль');
          return;
        }

        if (typeof data === 'object' && data !== null && 'message' in data) {
          const message = (data as { message?: unknown }).message;
          if (typeof message === 'string' && message.trim() !== '') {
            // Nest can return English messages from class-validator/guards; keep UX in Ukrainian.
            if (message.toLowerCase().includes('password confirmation')) {
              setChangePasswordError('Підтвердження пароля не співпадає');
              return;
            }
            setChangePasswordError(message);
            return;
          }
          if (Array.isArray(message)) {
            const first = message.find((m) => typeof m === 'string' && m.trim() !== '');
            if (typeof first === 'string') {
              if (first.toLowerCase().includes('password confirmation')) {
                setChangePasswordError('Підтвердження пароля не співпадає');
                return;
              }
              setChangePasswordError(first);
              return;
            }
          }
        }

        setChangePasswordError(fallback);
      })
      .finally(() => setChangingPassword(false));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error ?? 'Профіль недоступний'}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl mb-4 font-semibold text-foreground">Профіль</h1>
          <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Аватар</h2>
            <div className="flex gap-4 items-center">
            <div className="mt-3 flex items-center justify-start">
              <AvatarImage
                avatarPath={user.avatarPath}
                alt="Avatar"
                className="h-28 w-28 rounded-full border border-border object-cover"
              />
            </div>
            <div>
            {uploadError && (
              <p className="mt-3 text-xs text-destructive" role="alert">{uploadError}</p>
            )}
            <label className="mt-4 block">
              <span className="sr-only">Завантажити аватар</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-success file:px-3 file:py-2 file:text-sm file:font-medium file:text-success-foreground hover:file:bg-success/90 disabled:opacity-50"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/WebP, до 5 МБ. Зберігання в S3.</p>
            </div>
            </div>
          </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-foreground">Контактні дані</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Email</div>
                  <div className="font-mono text-sm text-foreground">{user.email}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-muted-foreground">Телефон</div>
                  <div className="text-sm text-foreground">{user.phone ? user.phone : '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-foreground">Особисті дані</h2>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetDraftFromUser(user);
                      setIsEditMode(true);
                    }}
                    className="rounded-md border border-input bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
                  >
                    Редагувати дані
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-input bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
                  >
                    Скасувати
                  </button>
                )}
              </div>

              <form onSubmit={saveProfile} className="mt-4 space-y-4">
              {saveError && (
                <div className="rounded bg-destructive/10 p-2 text-xs text-destructive" role="alert">{saveError}</div>
              )}
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-foreground">Ім'я</label>
                <input
                  id="profile-name"
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                />
              </div>
              <div>
                <label htmlFor="profile-company" className="block text-sm font-medium text-foreground">Назва компанії</label>
                <input
                  id="profile-company"
                  type="text"
                  maxLength={100}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-foreground">Телефон</label>
                <input
                  id="profile-phone"
                  type="tel"
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">Наприклад: +380501234567</p>
              </div>

              {isEditMode && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
                >
                  {saving ? 'Збереження…' : 'Зберегти'}
                </button>
              )}
            </form>
            </div>


            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Зміна пароля</h2>
              <form onSubmit={changePassword} className="mt-4 space-y-4">
                {changePasswordError && (
                  <div className="rounded bg-destructive/10 p-2 text-xs text-destructive" role="alert">{changePasswordError}</div>
                )}
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-foreground">
                    Поточний пароль
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    maxLength={64}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
                    Новий пароль
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    maxLength={64}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-foreground">
                    Підтвердіть новий пароль
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    maxLength={64}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {changingPassword ? 'Зміна…' : 'Змінити пароль'}
                </button>
              </form>
            </div>

        
          </div>
      </div>
    </main>
  );
}

