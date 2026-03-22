'use client';

import NextTopLoader from 'nextjs-toploader';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/** Top bar color aligned with `--primary` in light vs dark for contrast on each background. */
export function ThemedTopLoader(): JSX.Element {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const color = !mounted || resolvedTheme !== 'dark' ? '#243757' : '#6d8fd4';

  return (
    <NextTopLoader
      color={color}
      height={3}
      showSpinner={false}
      shadow={`0 0 10px ${color}, 0 0 5px ${color}`}
    />
  );
}
