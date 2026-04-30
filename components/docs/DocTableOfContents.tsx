'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavigation } from './NavigationContext';

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
  onShare?: () => void;
  onPublish?: () => void;
  projectName?: string;
  pages?: PageLink[];
  currentPageId?: string;
  canEdit?: boolean; // If false, hide edit and add page buttons
}

export const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({
  items,
  activeId,
  className,
  onAddPage,
  onEditPage,
  onShare,
  onPublish,
  projectName: _projectName,
  pages,
  currentPageId,
  canEdit = true,
}) => {
  const nav = useNavigation();
  const router = useRouter();
  const [isActionsCollapsed, setIsActionsCollapsed] = useState(false);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hoverScrollRafRef = useRef<number | null>(null);
  const topLevelItems = items.filter((item) => (item.level ?? 1) === 1);
  const prefetchHref = useCallback(
    (href: string) => {
      if (!href.startsWith('/docs')) return;
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      void router.prefetch(href);
    },
    [router]
  );

  if (topLevelItems.length === 0 && !pages?.length && !onAddPage) {
    return null;
  }

  const scrollSidebarToBottom = () => {
    const element = scrollContainerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  };

  const stopHoverScroll = () => {
    if (hoverScrollRafRef.current !== null) {
      cancelAnimationFrame(hoverScrollRafRef.current);
      hoverScrollRafRef.current = null;
    }
  };

  const startHoverScrollDown = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    stopHoverScroll();

    const scrollStep = () => {
      const currentElement = scrollContainerRef.current;
      if (!currentElement) {
        stopHoverScroll();
        return;
      }

      const maxScrollTop = currentElement.scrollHeight - currentElement.clientHeight;
      if (currentElement.scrollTop >= maxScrollTop) {
        stopHoverScroll();
        return;
      }

      currentElement.scrollTop = Math.min(currentElement.scrollTop + 2.2, maxScrollTop);
      hoverScrollRafRef.current = requestAnimationFrame(scrollStep);
    };

    hoverScrollRafRef.current = requestAnimationFrame(scrollStep);
  };

  useEffect(() => {
    return () => {
      stopHoverScroll();
    };
  }, []);

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
        <div ref={scrollContainerRef} className="p-6 pb-0 flex-1 overflow-y-auto no-scrollbar">
          {topLevelItems.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                On This Page
              </h2>
              <nav className="space-y-2">
                {topLevelItems.map((item) => {
                  const isActive = activeId === item.id;
                  
                  return (
                    <Link
                      key={item.id}
                      href={`#${item.id}`}
                      className={cn(
                        'block transition-colors',
                        'text-sm font-medium',
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
                topLevelItems.length > 0 ? "mt-8 pt-8 border-t border-gray-200" : ""
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
                        prefetch={false}
                        onMouseEnter={() => prefetchHref(page.href)}
                        onFocus={() => prefetchHref(page.href)}
                        onClick={(e) => {
                          if (nav && page.href.startsWith('/docs')) {
                            e.preventDefault();
                            nav.navigate(page.href);
                          }
                        }}
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
        <div className="relative mt-auto p-6 pt-8 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={() => setIsActionsCollapsed((prev) => !prev)}
            onMouseEnter={startHoverScrollDown}
            onMouseLeave={stopHoverScroll}
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition-all duration-200 hover:text-gray-700"
            aria-label={isActionsCollapsed ? "Expand actions" : "Collapse actions"}
            title={isActionsCollapsed ? "Expand actions" : "Collapse actions"}
          >
            <svg
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isActionsCollapsed && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              isActionsCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-80 opacity-100"
            )}
          >
            <div className="space-y-3">
            {onEditPage && canEdit && (
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
            {onAddPage && canEdit && (
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
            {onShare && (
              <button
                onClick={onShare}
                className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                title="Share this document"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            )}
            {onPublish && (
              <button
                onClick={onPublish}
                className="w-full text-sm text-[#CC561E] hover:text-[#B84A17] transition-colors flex items-center gap-2 px-3 py-2 rounded-md hover:bg-orange-50 border border-orange-200 hover:border-orange-300"
                title="Publish this document"
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Publish
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

