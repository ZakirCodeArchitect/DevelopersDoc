import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  label: string;
  level?: number;
}

export interface PageLink {
  id: string;
  title: string;
  href: string;
}

interface DocTableOfContentsProps {
  items: TocItem[];
  activeId?: string;
  className?: string;
  onAddPage?: () => void;
  onEditPage?: () => void;
  projectName?: string;
  pages?: PageLink[];
  currentPageId?: string;
}

export const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({
  items,
  activeId,
  className,
  onAddPage,
  onEditPage,
  projectName,
  pages,
  currentPageId,
}) => {
  // Always show the sidebar if there are items, pages, or an add page handler
  if (items.length === 0 && !pages?.length && !onAddPage) {
    return null;
  }

  return (
    <aside
      className={cn(
        'w-64 border-l border-gray-200 bg-gray-50',
        'fixed right-0 top-16 h-[calc(100vh-4rem)] flex flex-col',
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Scrollable section - "On This Page" and "Pages" */}
        <div className="p-6 pb-0 flex-1 overflow-y-auto">
          {items.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                On This Page
              </h2>
              <nav className="space-y-2">
                {items.map((item) => {
                  const isActive = activeId === item.id;
                  const level = item.level || 1;
                  // Calculate indentation: H2=level 1, H3=level 2, H4=level 3
                  const indentClass = level === 1 ? '' : level === 2 ? 'ml-4' : level === 3 ? 'ml-8' : 'ml-12';
                  const fontSize = level === 1 ? 'text-sm' : 'text-sm';
                  
                  return (
                    <Link
                      key={item.id}
                      href={`#${item.id}`}
                      className={cn(
                        'block transition-colors',
                        fontSize,
                        indentClass,
                        level === 1 && 'font-medium',
                        level > 1 && 'text-gray-600',
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
            </>
          )}

          {/* Pages list */}
          {pages && pages.length > 0 && (
            <>
              <div className={cn(
                items.length > 0 ? "mt-8 pt-8 border-t border-gray-200" : ""
              )}>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Pages
                </h2>
                <nav className="space-y-1">
                  {pages.map((page) => {
                    const isActive = currentPageId === page.id;
                    return (
                      <Link
                        key={page.id}
                        href={page.href}
                        className={cn(
                          'block text-sm transition-colors py-1.5 px-2 rounded-md',
                          isActive
                            ? 'text-blue-600 bg-blue-50 font-medium'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        {page.title}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </>
          )}
        </div>

        {/* Sticky bottom section - actions only */}
        <div className="mt-auto p-6 pt-8 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="space-y-3">
            {onEditPage && (
              <button
                onClick={onEditPage}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                title="Edit this page"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit this page
              </button>
            )}
            {onAddPage && (
              <button
                onClick={onAddPage}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                title="Add a new page to this document"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Page
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

