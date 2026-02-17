"use client";

import React, { createContext, useCallback, useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DocsLoadingSkeleton } from './DocsLoadingSkeleton';

type NavigateFn = (href: string) => void;

const NavigationContext = createContext<{
  isPending: boolean;
  navigate: NavigateFn;
} | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  return (
    <NavigationContext.Provider value={{ isPending, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  return ctx;
}

/** Renders skeleton when navigating between docs; otherwise renders children. */
export function DocsContentArea({ children }: { children: React.ReactNode }) {
  const nav = useNavigation();
  if (nav?.isPending) return <DocsLoadingSkeleton />;
  return <>{children}</>;
}
