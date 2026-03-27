'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';

import { getAuthApiClient } from '@/lib/api-client';
import { getAttachmentKind } from '@/lib/chat-file-message';
import { cn } from '@/lib/utils';

async function downloadFileAsBlob(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export interface FileMessageAttachmentProps {
  fileKey: string;
  fileName: string;
  /** Стилі для бульбашки чату (світліший текст на success) */
  variant?: 'default' | 'bubbleOwn';
  className?: string;
}

export function FileMessageAttachment({
  fileKey,
  fileName,
  variant = 'default',
  className,
}: FileMessageAttachmentProps): JSX.Element {
  const kind = getAttachmentKind(fileName);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);

  const isOwnBubble = variant === 'bubbleOwn';

  useEffect(() => {
    let cancelled = false;
    setLoadingUrl(true);
    setUrlError(null);
    setDownloadUrl(null);

    const api = getAuthApiClient();
    api
      .get<{ downloadUrl: string }>('/files/download-url', { params: { fileKey } })
      .then((res) => {
        if (!cancelled) setDownloadUrl(res.data.downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setUrlError('Не вдалося отримати посилання на файл');
      })
      .finally(() => {
        if (!cancelled) setLoadingUrl(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileKey]);

  useEffect(() => {
    if (kind !== 'text' || !downloadUrl) return;
    let cancelled = false;
    setTextLoading(true);
    setTextError(false);
    setTextPreview(null);

    fetch(downloadUrl, { mode: 'cors' })
      .then((r) => {
        if (!r.ok) throw new Error('bad response');
        return r.text();
      })
      .then((t) => {
        if (!cancelled) {
          const max = 8000;
          setTextPreview(t.length > max ? `${t.slice(0, max)}\n…` : t);
        }
      })
      .catch(() => {
        if (!cancelled) setTextError(true);
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, downloadUrl]);

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    void downloadFileAsBlob(downloadUrl, fileName);
  }, [downloadUrl, fileName]);

  const btnClass = cn(
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
    isOwnBubble
      ? 'bg-success-foreground/15 text-success-foreground hover:bg-success-foreground/25'
      : 'bg-muted text-foreground hover:bg-muted/80',
  );

  if (loadingUrl) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-80" aria-hidden />
        <span className={isOwnBubble ? 'text-success-foreground/90' : 'text-muted-foreground'}>Завантаження…</span>
      </div>
    );
  }

  if (urlError || !downloadUrl) {
    return (
      <div className={cn('text-sm', isOwnBubble ? 'text-success-foreground/90' : 'text-destructive', className)}>
        {urlError ?? 'Файл недоступний'}
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className={cn('space-y-2', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={downloadUrl}
          alt={fileName}
          className="max-h-72 max-w-full rounded-lg border border-black/10 object-contain dark:border-white/10"
        />
        <button type="button" onClick={handleDownload} className={btnClass}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          Завантажити
        </button>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="overflow-hidden rounded-lg border border-black/10 bg-muted/30 dark:border-white/10">
          <iframe
            title={fileName}
            src={downloadUrl}
            className="h-56 w-full min-h-[200px] bg-background"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm font-medium',
              isOwnBubble ? 'text-success-foreground' : 'text-foreground',
            )}
          >
            {fileName}
          </span>
          <button type="button" onClick={handleDownload} className={btnClass}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Завантажити
          </button>
        </div>
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {textLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Завантаження тексту…
          </div>
        )}
        {textError && (
          <p className="text-xs text-muted-foreground">
            Прев’ю недоступне (обмеження CORS у S3). Відкрийте файл або завантажте.
          </p>
        )}
        {textPreview !== null && !textError && (
          <pre
            className={cn(
              'max-h-48 overflow-auto rounded-md border border-black/10 bg-background/50 p-3 text-left text-xs leading-relaxed dark:border-white/10',
              isOwnBubble ? 'text-success-foreground' : 'text-foreground',
            )}
          >
            {textPreview}
          </pre>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm font-medium',
              isOwnBubble ? 'text-success-foreground' : 'text-foreground',
            )}
          >
            {fileName}
          </span>
          <button type="button" onClick={handleDownload} className={btnClass}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Завантажити
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm font-medium',
          isOwnBubble ? 'text-success-foreground' : 'text-foreground',
        )}
      >
        {fileName}
      </span>
      <button type="button" onClick={handleDownload} className={btnClass}>
        <Download className="h-3.5 w-3.5" aria-hidden />
        Завантажити
      </button>
    </div>
  );
}
