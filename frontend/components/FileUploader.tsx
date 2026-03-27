'use client';

import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { Paperclip } from 'lucide-react';

import { getAuthApiClient } from '@/lib/api-client';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

function resolveMime(file: File): string | null {
  const raw = file.type?.split(';')[0]?.trim().toLowerCase();
  if (raw && ALLOWED_MIME.has(raw)) return raw;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  const fromExt = EXT_TO_MIME[ext];
  return fromExt && ALLOWED_MIME.has(fromExt) ? fromExt : null;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return 'Файл завеликий. Максимум 10 МБ.';
  }
  const mime = resolveMime(file);
  if (!mime) {
    return 'Недопустимий тип. Дозволено: JPEG, PNG, WebP, PDF, TXT.';
  }
  return null;
}

export interface FileUploaderProps {
  /** Після завантаження в S3 — передайте `fileKey` у повідомлення чату. */
  onSuccess: (fileKey: string, fileName: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUploader({ onSuccess, disabled, className }: FileUploaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickFile = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || disabled || isUploading) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const fileType = resolveMime(file)!;
      setError(null);
      setIsUploading(true);
      setProgress(0);

      try {
        const api = getAuthApiClient();
        const { data } = await api.get<{ uploadUrl: string; fileKey: string }>('/files/upload-url', {
          params: { fileName: file.name, fileType },
        });

        await axios.put(data.uploadUrl, file, {
          headers: { 'Content-Type': fileType },
          onUploadProgress: (ev) => {
            if (ev.total) {
              setProgress(Math.round((ev.loaded * 100) / ev.total));
            }
          },
        });

        onSuccess(data.fileKey, file.name);
        setProgress(100);
      } catch (err: unknown) {
        const message =
          axios.isAxiosError(err) && err.response?.status === 503
            ? 'Завантаження файлів тимчасово недоступне.'
            : axios.isAxiosError(err) && err.code === 'ERR_NETWORK'
              ? 'Мережа недоступна. Перевірте з’єднання.'
              : 'Не вдалося завантажити файл. Спробуйте ще раз.';
        setError(message);
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 400);
      }
    },
    [disabled, isUploading, onSuccess],
  );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
        className="sr-only"
        onChange={onChange}
        disabled={disabled || isUploading}
        aria-hidden
      />
      <button
        type="button"
        onClick={pickFile}
        disabled={disabled || isUploading}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-50"
        title="Прикріпити файл"
        aria-label="Прикріпити файл"
      >
        {isUploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Paperclip className="h-5 w-5" aria-hidden />
        )}
      </button>
      {isUploading && progress > 0 && progress < 100 && (
        <div className="mt-1 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-success transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && (
        <p className="mt-1 max-w-[220px] text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
