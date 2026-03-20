'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';
import { createApiClient } from '@/lib/api-client';
import type { AuthUser } from '@/lib/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch user profile with the new token
    const api = createApiClient({ getToken: () => token });
    api.get<AuthUser>('/users/me')
      .then((res) => {
        setAuth({ accessToken: token, user: res.data });
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      <p className="text-sm text-gray-600">Авторизація...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />}>
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
