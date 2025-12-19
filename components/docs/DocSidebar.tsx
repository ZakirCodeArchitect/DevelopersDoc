"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface DocSidebarProps {
  items: NavItem[];
  currentPath?: string;
  className?: string;
}

export const DocSidebar: React.FC<DocSidebarProps> = ({
  items,
  currentPath,
  className,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href: string) => {
    return currentPath === href || currentPath?.startsWith(href + '/');
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);
    const active = isActive(item.href);

    return (
      <div key={item.label} className={cn(level > 0 && 'ml-4')}>
        <div className="flex items-center">
          {hasChildren && (
            <button
              onClick={() => toggleExpand(item.label)}
              className="mr-1 p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded && 'rotate-90'
                )}
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
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          <Link
            href={item.href}
            className={cn(
              'flex-1 py-1.5 px-2 text-sm rounded-md transition-colors',
              active
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {item.label}
          </Link>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'w-64 border-r border-gray-200 bg-white',
        'fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto',
        className
      )}
    >
      <nav className="p-4 space-y-1">
        {items.map((item) => renderNavItem(item))}
      </nav>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-gray-500">
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
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <span>Light</span>
      </div>
    </aside>
  );
};

