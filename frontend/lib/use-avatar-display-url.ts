'use client';

import { useEffect, useState } from 'react';

import { getAuthApiClient } from '@/lib/api-client';

function localUploadsAvatarUrl(avatarPath: string): string | null {
  if (!avatarPath.startsWith('/uploads/')) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  return `${origin}${avatarPath}`;
}

/**
 * URL для відображення аватара: локальні `/uploads/...` синхронно;
 * ключі S3 (`avatars/...`) — presigned GET через `/files/download-url` (працює з приватним бакетом).
 */
export function useAvatarDisplayUrl(
  avatarPath: string | null | undefined,
): { displayUrl: string | null; loading: boolean } {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!avatarPath) {
      setDisplayUrl(null);
      setLoading(false);
      return;
    }

    const local = localUploadsAvatarUrl(avatarPath);
    if (local) {
      setDisplayUrl(local);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getAuthApiClient()
      .get<{ downloadUrl: string }>('/files/download-url', { params: { fileKey: avatarPath } })
      .then((res) => {
        if (!cancelled) setDisplayUrl(res.data.downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  return { displayUrl, loading };
}
