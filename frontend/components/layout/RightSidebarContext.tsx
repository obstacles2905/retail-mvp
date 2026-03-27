'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type RightSidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
};

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null);

export function RightSidebarProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle: () => setIsOpen((v) => !v),
    }),
    [isOpen],
  );
  return <RightSidebarContext.Provider value={value}>{children}</RightSidebarContext.Provider>;
}

export function useRightSidebar(): RightSidebarContextValue {
  const ctx = useContext(RightSidebarContext);
  if (!ctx) {
    throw new Error('useRightSidebar must be used within RightSidebarProvider');
  }
  return ctx;
}
