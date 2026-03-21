'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import type { AxiosError } from 'axios';

import { getAuthApiClient } from '@/lib/api-client';
import {
  type AuthUser,
  getStoredToken,
  getStoredUser,
  setAuth,
} from '@/lib/auth';

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
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);

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
    setSaveSuccess(null);
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
        setSaveSuccess('Зміни збережено');
        setIsEditMode(false);
        window.setTimeout(() => setSaveSuccess(null), 2500);
      })
      .catch(() => setSaveError('Не вдалося зберегти зміни'))
      .finally(() => setSaving(false));
  };

  const cancelEdit = (): void => {
    if (!user) return;
    resetDraftFromUser(user);
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditMode(false);
  };

  const uploadAvatar = (file: File): void => {
    if (!user) return;
    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    api
      .post<UserMe>('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => {
        setUser(res.data);
        persistUser(res.data);
        setUploadSuccess('Аватар оновлено');
        window.setTimeout(() => setUploadSuccess(null), 2500);
      })
      .catch(() => setUploadError('Не вдалося завантажити аватар'))
      .finally(() => setUploading(false));
  };

  const changePassword = (e: React.FormEvent): void => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

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
        setChangePasswordSuccess('Пароль змінено');
        window.setTimeout(() => setChangePasswordSuccess(null), 2500);
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
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? 'Профіль недоступний'}
        </div>
      </main>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const avatarUrl = user.avatarPath ? `${baseUrl}${user.avatarPath}` : null;

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f5f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
            RetailProcure
          </Link>
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            ← В кабінет
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Профіль</h1>

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Аватар</h2>
            <div className="mt-3 flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-28 w-28 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <span className="text-sm font-semibold">—</span>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="mt-3 text-xs text-red-600" role="alert">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="mt-3 text-xs text-emerald-700" role="status">{uploadSuccess}</p>
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
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">PNG/JPG/WebP, до 5 МБ.</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Контактні дані</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-gray-600">Email</div>
                  <div className="font-mono text-sm text-gray-900">{user.email}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-gray-600">Телефон</div>
                  <div className="text-sm text-gray-900">{user.phone ? user.phone : '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Особисті дані</h2>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetDraftFromUser(user);
                      setIsEditMode(true);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Редагувати дані
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Скасувати
                  </button>
                )}
              </div>

              <form onSubmit={saveProfile} className="mt-4 space-y-4">
              {saveError && (
                <div className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-800" role="status">{saveSuccess}</div>
              )}
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Ім'я</label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="profile-company" className="block text-sm font-medium text-gray-700">Назва компанії</label>
                <input
                  id="profile-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700">Телефон</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditMode}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">Наприклад: +380501234567</p>
              </div>

              {isEditMode && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Збереження…' : 'Зберегти'}
                </button>
              )}
            </form>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Зміна пароля</h2>
              <form onSubmit={changePassword} className="mt-4 space-y-4">
                {changePasswordError && (
                  <div className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">{changePasswordError}</div>
                )}
                {changePasswordSuccess && (
                  <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-800" role="status">
                    {changePasswordSuccess}
                  </div>
                )}
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                    Поточний пароль
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                    Новий пароль
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700">
                    Підтвердіть новий пароль
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={changingPassword}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                >
                  {changingPassword ? 'Зміна…' : 'Змінити пароль'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

