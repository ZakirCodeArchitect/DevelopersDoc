"use client";

import React, { createContext, useCallback, useContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
      void router.prefetch(href);
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

/**
 * Keeps the previous page visible during client navigations (useTransition).
 * Replacing the whole tree with a skeleton made every click feel slower than the server.
 */
export function DocsContentArea({ children }: { children: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      {nav?.isPending ? (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-0.5 animate-pulse bg-[#CC561E]/90"
          role="status"
          aria-label="Loading"
        />
      ) : null}
      {children}
    </div>
  );
}
