"use client"

import React, { useState, useEffect } from 'react';
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
  // Initialize with default state to avoid hydration mismatch
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Your Docs']));
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage and auto-expand after hydration
  useEffect(() => {
    setIsHydrated(true);
    
    // Load from localStorage
    const saved = localStorage.getItem('docs-sidebar-expanded');
    let initialExpanded = new Set(['Your Docs']);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        initialExpanded = new Set(parsed);
      } catch {
        // If parsing fails, use default
      }
    }

    // Auto-expand sections that contain the active page
    const findParentSection = (items: NavItem[], targetPath: string): string | null => {
      for (const item of items) {
        if (item.children) {
          // Check if any child matches the target path
          const childMatches = item.children.some((child) => {
            if (child.href === targetPath) return true;
            if (child.children) {
              return findParentSection([child], targetPath) !== null;
            }
            return false;
          });
          if (childMatches) {
            return item.label;
          }
          // Recursively check children
          const found = findParentSection(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    if (currentPath) {
      const parentSection = findParentSection(items, currentPath);
      if (parentSection) {
        initialExpanded.add(parentSection);
      }
    }

    setExpandedItems(initialExpanded);
  }, [currentPath, items]);

  // Persist expanded items to localStorage
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('docs-sidebar-expanded', JSON.stringify(Array.from(expandedItems)));
    }
  }, [expandedItems, isHydrated]);

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
    if (!currentPath) return false;
    // Exact match
    if (currentPath === href) return true;
    // For sub-paths, only match if currentPath starts with href + '/' and href is not just '/docs'
    // This prevents '/docs' from matching '/docs/another-page'
    if (href === '/docs' && currentPath !== '/docs') return false;
    // Allow sub-path matching for other routes (e.g., /docs/projects/project-1 matches /docs/projects)
    return currentPath.startsWith(href + '/');
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);
    const active = isActive(item.href);
    // Items with href='#' are collapsible headers (Projects, Your Docs)
    const isCollapsibleHeader = item.href === '#';
    // Projects are always collapsible (even if they have no documents yet)
    // A project href is like /docs/projects/project-1 (3 segments), documents have 4+ segments
    const pathSegments = item.href.split('/').filter(Boolean);
    const isProject = pathSegments.length === 3 && pathSegments[0] === 'docs' && pathSegments[1] === 'projects';

    return (
      <div key={item.label} className={cn(level > 0 && level === 1 && 'ml-1', level > 1 && 'ml-2')}>
        <div className="flex items-center">
          {!isCollapsibleHeader && !isProject && hasChildren && (
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
          {!isCollapsibleHeader && !isProject && !hasChildren && <div className="w-5" />}
          {isCollapsibleHeader ? (
            <span
              className={cn(
                'flex-1 py-1.5 px-2 text-sm rounded-md transition-colors cursor-pointer font-medium',
                'text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-1'
              )}
              onClick={() => toggleExpand(item.label)}
            >
              {item.label}
              <svg
                className={cn(
                  'w-3 h-3 transition-transform',
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
            </span>
          ) : isProject ? (
            <div className="flex-1 flex items-center gap-1">
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
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpand(item.label);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={cn(
                    'w-3 h-3 transition-transform',
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
            </div>
          ) : (
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
          )}
        </div>
        {(hasChildren || isProject) && isExpanded && (
          <div className="mt-1 space-y-0.5">
            {item.children && item.children.length > 0 && item.children.map((child) => renderNavItem(child, level + 1))}
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

