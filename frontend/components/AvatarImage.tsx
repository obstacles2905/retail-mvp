'use client';

import { useEffect, useState } from 'react';

import { useAvatarDisplayUrl } from '@/lib/use-avatar-display-url';
import { cn } from '@/lib/utils';

export interface AvatarImageProps {
  avatarPath: string | null | undefined;
  alt: string;
  /** Класи для зображення (розмір, round, object-cover). */
  className?: string;
  /** Додаткові класи для кружка без фото (наприклад `bg-success/15`). */
  placeholderClassName?: string;
  /** Плейсхолдер, коли немає фото або помилка завантаження. */
  placeholder?: React.ReactNode;
}

export function AvatarImage({
  avatarPath,
  alt,
  className,
  placeholderClassName,
  placeholder,
}: AvatarImageProps): JSX.Element {
  const { displayUrl, loading } = useAvatarDisplayUrl(avatarPath);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [displayUrl]);

  const defaultPlaceholder = (
    <span className="text-sm font-semibold">—</span>
  );

  if (loading) {
    return (
      <div
        className={cn('animate-pulse rounded-full bg-muted', className)}
        aria-hidden
      />
    );
  }

  if (!displayUrl || imgFailed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground',
          className,
          placeholderClassName,
        )}
      >
        {placeholder ?? defaultPlaceholder}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      onError={() => setImgFailed(true)}
    />
  );
}
