import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  label: string;
  level?: number;
}

interface DocTableOfContentsProps {
  items: TocItem[];
  activeId?: string;
  className?: string;
}

export const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({
  items,
  activeId,
  className,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        'w-64 border-l border-gray-200 bg-gray-50',
        'fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto',
        className
      )}
    >
      <div className="p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          On This Page
        </h2>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = activeId === item.id;
            const level = item.level || 1;
            return (
              <Link
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  'block text-sm transition-colors',
                  level === 1 && 'font-medium',
                  level > 1 && 'ml-4 text-gray-600',
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
          <Link
            href="#feedback"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            Question? Give us feedback{' '}
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
          <Link
            href="#edit"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Edit this page
          </Link>
        </div>
      </div>
    </aside>
  );
};

