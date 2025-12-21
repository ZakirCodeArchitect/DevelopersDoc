import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  // Don't render if neither previous nor next exists
  if (!previous && !next) {
    return null;
  }

  return (
    <nav
      className={cn(
        'flex items-center justify-between w-full',
        className
      )}
    >
      <div className="flex-1">
        {previous ? (
          <Link
            href={previous.href}
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
      <div className="flex-1 flex justify-end">
        {next ? (
          <Link
            href={next.href}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex"
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
      </div>
    </nav>
  );
};

