'use client';

import React, { useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigation } from './NavigationContext';

export interface NavLink {
  label: string;
  href: string;
}

interface DocNavigationProps {
  previous?: NavLink;
  next?: NavLink;
  className?: string;
}

export const DocNavigation: React.FC<DocNavigationProps> = ({
  previous,
  next,
  className,
}) => {
  const nav = useNavigation();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const prefetchHref = useCallback(
    (href: string) => {
      if (!href.startsWith('/docs')) return;
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      void router.prefetch(href);
    },
    [router]
  );

  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      className={cn(
        'relative flex items-center w-full',
        className
      )}
    >
      <div>
        {previous ? (
          <Link
            href={previous.href}
            prefetch={false}
            onMouseEnter={() => prefetchHref(previous.href)}
            onFocus={() => prefetchHref(previous.href)}
            onClick={(e) => {
              if (nav && previous.href.startsWith('/docs')) {
                e.preventDefault();
                nav.navigate(previous.href);
              }
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{previous.label}</span>
          </Link>
        ) : null}
      </div>
      {next ? (
        <Link
          href={next.href}
          prefetch={false}
          onMouseEnter={() => prefetchHref(next.href)}
          onFocus={() => prefetchHref(next.href)}
          onClick={(e) => {
            if (nav && next.href.startsWith('/docs')) {
              e.preventDefault();
              nav.navigate(next.href);
            }
          }}
          className="absolute right-0 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex"
        >
          <span>{next.label}</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      ) : null}
    </nav>
  );
};

