"use client"

import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ContextMenu } from './ContextMenu';

// Wrapper component to handle hover visibility
const ContextMenuWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div 
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 [&[data-menu-open='true']]:opacity-100"
      style={{ pointerEvents: 'auto' }}
    >
      {children}
    </div>
  );
};

// Sync active link styles without causing DocSidebar to re-render on navigation.
const SidebarActiveSync = ({
  navRef,
  pathnameRef,
  currentPathProp,
}: {
  navRef: React.RefObject<HTMLElement | null>;
  pathnameRef: React.MutableRefObject<string>;
  currentPathProp?: string;
}) => {
  const pathname = usePathname();

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const currentPathValue = currentPathProp ?? pathname;
    pathnameRef.current = currentPathValue;

    // Update active states via DOM manipulation (no React state updates)
    navElement.querySelectorAll('[data-nav-href]').forEach((link) => {
      link.classList.remove('bg-blue-50', 'text-blue-600', 'font-medium');
      link.classList.add('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    // Add active class to current active items (exact match)
    const activeLinks = navElement.querySelectorAll(`[data-nav-href="${currentPathValue}"]`);
    activeLinks.forEach((link) => {
      link.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
      link.classList.remove('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
    });

    // Also handle sub-path matching
    navElement.querySelectorAll('[data-nav-href]').forEach((link) => {
      const href = link.getAttribute('data-nav-href');
      if (!href || href === currentPathValue) return;
      if (href === '/docs' && currentPathValue !== '/docs') return;
      if (currentPathValue.startsWith(href + '/')) {
        link.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
        link.classList.remove('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
      }
    });
  }, [pathname, currentPathProp, navRef, pathnameRef]);

  return null;
};

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

interface DocSidebarProps {
  items: NavItem[];
  currentPath?: string;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCreateProject?: () => void;
  onCreateDoc?: (projectId?: string, projectName?: string) => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onRenameDoc?: (docId: string, currentName: string, projectId?: string) => void;
  onDeleteDoc?: (docId: string, docName: string, projectId?: string) => void;
}

const DocSidebarComponent: React.FC<DocSidebarProps> = ({
  items,
  currentPath: currentPathProp,
  className,
  isCollapsed = false,
  onToggleCollapse,
  onCreateProject,
  onCreateDoc,
  onRenameProject,
  onDeleteProject,
  onRenameDoc,
  onDeleteDoc,
}) => {
  const router = useRouter();
  
  // Get initial pathname from window.location to avoid usePathname() re-renders
  const getInitialPathname = () => {
    if (typeof window === 'undefined') return '/docs';
    return window.location.pathname;
  };
  
  const pathnameRef = useRef(getInitialPathname());
  // Use currentPathProp if provided, otherwise use the ref (which will be updated via DOM)
  const currentPath = currentPathProp ?? pathnameRef.current;
  
  // IMPORTANT: Keep initial render identical between server and client to avoid hydration mismatch.
  // We only hydrate from localStorage AFTER mount in an effect.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set(['Your Docs']));

  const itemsRef = useRef(items);
  const currentPathRef = useRef(currentPath);
  const navRef = useRef<HTMLElement>(null);
  // Track manually collapsed projects to prevent auto-expand from overriding user intent
  const manuallyCollapsedRef = useRef<Set<string>>(new Set());
  // Track expanded items in a ref to avoid closure issues
  const expandedItemsRef = useRef(expandedItems);
  // Track if "Projects" was manually toggled - only animate on manual toggle
  const projectsManuallyToggledRef = useRef(false);
  
  // Keep refs in sync without causing re-renders
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Prefetch strategy:
  // - Automatic Link prefetch across a large sidebar can trigger MANY background RSC fetches,
  //   which looks like "latency" and can overload the dev server/DB.
  // - Instead, prefetch only the hovered/focused link (one at a time).
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());
  const prefetchHref = useCallback((href?: string) => {
    if (!href) return;
    if (prefetchedHrefsRef.current.has(href)) return;
    prefetchedHrefsRef.current.add(href);
    router.prefetch(href);
  }, [router]);

  // After mount: restore expanded state from localStorage and ensure current route is visible.
  // This will cause at most ONE re-render after hydration (acceptable) and prevents hydration mismatch.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setsEqual = (a: Set<string>, b: Set<string>) => {
      if (a.size !== b.size) return false;
      for (const v of a) if (!b.has(v)) return false;
      return true;
    };

    const findLabelByHref = (navItems: NavItem[], href: string): string | null => {
      for (const item of navItems) {
        if (item.href === href) return item.label;
        if (item.children) {
          const found = findLabelByHref(item.children, href);
          if (found) return found;
        }
      }
      return null;
    };

    let nextExpanded = new Set<string>(['Your Docs']);

    try {
      const saved = localStorage.getItem('docs-sidebar-expanded');
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        nextExpanded = new Set(parsed);
      }
    } catch {
      // ignore
    }

    // Ensure the current route is visible on initial load.
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'docs') {
      if (segments[1] === 'projects' && segments[2]) {
        nextExpanded.add('Projects');
        const projectHref = `/docs/projects/${segments[2]}`;
        const projectLabel = findLabelByHref(itemsRef.current, projectHref);
        if (projectLabel) nextExpanded.add(projectLabel);
      } else if (segments.length >= 2) {
        nextExpanded.add('Your Docs');
      }
    }

    setExpandedItems((prev) => (setsEqual(prev, nextExpanded) ? prev : nextExpanded));
  }, []);
  
  // Keep expandedItemsRef in sync with state
  useEffect(() => {
    expandedItemsRef.current = expandedItems;
    
    // Reset the manual toggle flag after transition completes
    if (projectsManuallyToggledRef.current) {
      setTimeout(() => {
        projectsManuallyToggledRef.current = false;
      }, 250); // After transition duration (200ms + buffer)
    }
  }, [expandedItems]);
  
  // Keep currentPathRef in sync for click handlers (project toggles).
  useEffect(() => {
    currentPathRef.current = currentPathProp ?? pathnameRef.current;
  }, [currentPathProp]);

  // Persist expanded items to localStorage - debounced to prevent excessive writes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      const itemsArray = Array.from(expandedItems);
      localStorage.setItem('docs-sidebar-expanded', JSON.stringify(itemsArray));
    }, 100); // Debounce by 100ms

    return () => clearTimeout(timeoutId);
  }, [expandedItems]);

  const toggleExpand = (label: string) => {
    const newExpanded = new Set(expandedItems);
    const wasExpanded = newExpanded.has(label);
    
    if (wasExpanded) {
      newExpanded.delete(label);
      // Track that this was manually collapsed
      manuallyCollapsedRef.current.add(label);
    } else {
      newExpanded.add(label);
      // Remove from manually collapsed set if it was there
      manuallyCollapsedRef.current.delete(label);
    }
    
    // Mark "Projects" as manually toggled so transition can animate
    if (label === 'Projects') {
      projectsManuallyToggledRef.current = true;
    }
    
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.label);
    
    // For "Projects" header, only animate if it was manually toggled
    // Never animate on navigation or re-renders - only on manual user click
    const shouldAnimateProjects = item.label === 'Projects'
      ? projectsManuallyToggledRef.current
      : true; // Always animate for other items
    
    // Don't calculate active state during render to avoid hydration mismatch
    // Active states will be set via DOM manipulation after hydration
    // Items with href='#' are collapsible headers (Projects, Your Docs)
    const isCollapsibleHeader = item.href === '#';
    // Projects are always collapsible (even if they have no documents yet)
    // A project href is like /docs/projects/project-1 (3 segments), documents have 4+ segments
    const pathSegments = item.href.split('/').filter(Boolean);
    const isProject = pathSegments.length === 3 && pathSegments[0] === 'docs' && pathSegments[1] === 'projects';
    // Documents under projects have 4+ segments: /docs/projects/{projectId}/{docId}
    const isProjectDocument = pathSegments.length >= 4 && pathSegments[0] === 'docs' && pathSegments[1] === 'projects';

    return (
      <div 
        key={item.label} 
        className={cn(
          level > 0 && level === 1 && !isProject && 'ml-1',
          level > 0 && level === 1 && isProject && 'ml-4',
          level > 1 && !isProjectDocument && 'ml-2',
          level > 1 && isProjectDocument && 'ml-0',
          !isCollapsibleHeader && !isProjectDocument && 'hover:bg-gray-50/50 rounded px-1',
          !isCollapsibleHeader && isProjectDocument && level > 1 && 'hover:bg-gray-50/50 rounded pr-1'
        )}
        style={level > 0 && level === 1 && isProject ? { marginLeft: '1rem' } : undefined}
      >
        <div className="flex items-center">
          {!isCollapsibleHeader && !isProject && hasChildren && (
            <button
              onClick={() => toggleExpand(item.label)}
              className="mr-1 p-1 hover:bg-gray-100 rounded"
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
          {!isCollapsibleHeader && !isProject && !hasChildren && item.label !== 'Dashboard' && <div className="w-4" />}
          {isCollapsibleHeader ? (
            <div className="flex-1 flex items-center gap-1">
            <span
              className={cn(
                'flex-1 py-1.5 px-2 text-sm rounded-md cursor-pointer font-medium',
                'text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-1'
              )}
              onClick={() => toggleExpand(item.label)}
            >
              {item.label}
              <svg
                className={cn(
                  'w-3 h-3 flex-shrink-0',
                  // Only apply transition if state actually changed (for "Projects" header)
                  shouldAnimateProjects && 'transition-transform duration-200',
                  isExpanded ? 'rotate-90' : 'rotate-0'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
              {item.label === 'Projects' && onCreateProject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateProject();
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                aria-label="Create new project"
                title="Create new project"
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
                </button>
              )}
              {item.label === 'Your Docs' && onCreateDoc && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateDoc();
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                  aria-label="Create new doc"
                  title="Create new doc"
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
                </button>
              )}
            </div>
          ) : isProject ? (
            <div className="flex-1 flex items-center gap-1 group min-w-0">
              <Link
                href={item.href}
                prefetch={false}
                data-nav-href={item.href}
                onMouseEnter={() => prefetchHref(item.href)}
                onFocus={() => prefetchHref(item.href)}
                onClick={(e) => {
                  // Get current path to check if this is the active project
                  const currentPathValue = currentPathProp ?? (typeof window !== 'undefined' ? window.location.pathname : '');
                  const isCurrentlyActive = currentPathValue === item.href || currentPathValue.startsWith(item.href + '/');
                  
                  // Only toggle expansion if clicking on the currently active project
                  // If clicking on a different project, just navigate without changing expansion state
                  if (isCurrentlyActive) {
                    // This is the active project - toggle it
                    if (!isExpanded) {
                      // Project is collapsed - expand it
                      manuallyCollapsedRef.current.delete(item.label);
                      setExpandedItems(prev => {
                        const newSet = new Set(prev);
                        newSet.add(item.label);
                        // Preserve "Projects" and "Your Docs" headers
                        if (prev.has('Projects')) newSet.add('Projects');
                        if (prev.has('Your Docs')) newSet.add('Your Docs');
                        return newSet;
                      });
                    } else {
                      // Project is expanded - collapse it
                      e.preventDefault(); // Prevent navigation since we're just toggling
                  toggleExpand(item.label);
                    }
                  } else {
                    // Clicking on a different project - preserve its current state
                    // If it's collapsed, mark it as manually collapsed so auto-expand won't expand it
                    if (!isExpanded) {
                      manuallyCollapsedRef.current.add(item.label);
                    }
                    // Just let navigation happen - don't change expansion state
                  }
                }}
                className={cn(
                  'py-1.5 px-2 text-sm rounded-md truncate flex-1 min-w-0 flex items-center gap-1 cursor-pointer',
                  'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  // Active state will be set via DOM manipulation to avoid hydration mismatch
                )}
              >
                {item.label}
                <svg
                  className={cn(
                    'w-3 h-3 flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                  style={{
                    transition: 'transform 0.1s ease-out',
                  }}
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
              {onRenameProject && onDeleteProject && (
                <div 
                  data-context-menu
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 [&[data-menu-open='true']]:opacity-100 flex-shrink-0"
                >
                  <ContextMenu
                    onRename={() => {
                      const projectId = pathSegments[2];
                      onRenameProject(projectId, item.label);
                    }}
                    onDelete={() => {
                      const projectId = pathSegments[2];
                      onDeleteProject(projectId, item.label);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-1 group min-w-0">
            <Link
              href={item.href}
                prefetch={false}
              data-nav-href={item.href}
              onMouseEnter={() => prefetchHref(item.href)}
              onFocus={() => prefetchHref(item.href)}
              className={cn(
                'py-1.5 pr-2 text-sm rounded-md truncate flex-1 min-w-0',
                level > 1 && isProjectDocument ? 'pl-2' : 'px-2',
                'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                // Active state will be set via DOM manipulation to avoid hydration mismatch
              )}
            >
              {item.label}
            </Link>
              {item.label === 'Dashboard' && onToggleCollapse && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCollapse();
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 flex-shrink-0"
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isCollapsed && "rotate-180"
                    )}
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
                </button>
              )}
              {onRenameDoc && onDeleteDoc && !isCollapsibleHeader && item.label !== 'Dashboard' && (
                <div 
                  data-context-menu
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 [&[data-menu-open='true']]:opacity-100 flex-shrink-0"
                >
                  <ContextMenu
                    onRename={() => {
                      // Determine if it's a project document or "Your Docs" document
                      const isProjectDoc = pathSegments.length >= 4 && pathSegments[1] === 'projects';
                      const docId = isProjectDoc ? pathSegments[3] : pathSegments[1];
                      const projectId = isProjectDoc ? pathSegments[2] : undefined;
                      onRenameDoc(docId, item.label, projectId);
                    }}
                    onDelete={() => {
                      // Determine if it's a project document or "Your Docs" document
                      const isProjectDoc = pathSegments.length >= 4 && pathSegments[1] === 'projects';
                      const docId = isProjectDoc ? pathSegments[3] : pathSegments[1];
                      const projectId = isProjectDoc ? pathSegments[2] : undefined;
                      onDeleteDoc(docId, item.label, projectId);
                    }}
                  />
                </div>
              )}
            </div>
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
      data-collapsible-sidebar="true"
      className={cn(
        'w-64 border-r border-gray-200 bg-white',
        'fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-10',
        'transition-transform duration-300 ease-in-out',
        className
      )}
      style={{ 
        transform: isCollapsed ? 'translateX(-100%) translateZ(0)' : 'translateZ(0)', // Force GPU acceleration and handle collapse
        willChange: 'auto',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        contain: 'layout style paint' // Isolate rendering
      }}
      suppressHydrationWarning
    >
      <nav ref={navRef} className="p-4 pb-20 space-y-1">
        <SidebarActiveSync navRef={navRef} pathnameRef={pathnameRef} currentPathProp={currentPathProp} />
        {items.map((item) => renderNavItem(item))}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <button
          type="button"
          onClick={() => {
            // TODO: Implement settings logic
            // Settings clicked - no re-render expected
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Settings"
          title="Settings"
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

// Deep comparison function for NavItem arrays
const deepCompareNavItems = (prev: NavItem[], next: NavItem[]): boolean => {
  if (prev.length !== next.length) return false;
  
  for (let i = 0; i < prev.length; i++) {
    const prevItem = prev[i];
    const nextItem = next[i];
    
    if (prevItem.label !== nextItem.label || prevItem.href !== nextItem.href) {
      return false;
    }
    
    // Deep compare children recursively
    if (prevItem.children && nextItem.children) {
      if (!deepCompareNavItems(prevItem.children, nextItem.children)) {
        return false;
      }
    } else if (prevItem.children !== nextItem.children) {
      // One has children, the other doesn't
      return false;
    }
  }
  
  return true;
};

// Custom comparison for DocSidebar - Ultra-strict to prevent any flashing
// STRATEGY: Only re-render when structure OR path changes, but batch the updates
// Note: If currentPath is not provided, DocSidebar uses usePathname() internally
// so path changes will be handled by React's hook system, not props
const areSidebarPropsEqual = (
  prevProps: DocSidebarProps,
  nextProps: DocSidebarProps
) => {
  // Only re-render if visual props changed
  // 1. Check collapse state
  if (prevProps.isCollapsed !== nextProps.isCollapsed) {
    return false; // Allow re-render
  }

  // 2. Check items - do deep comparison
  if (prevProps.items !== nextProps.items) {
    if (!deepCompareNavItems(prevProps.items, nextProps.items)) {
      return false; // Structure changed - allow re-render
    }
    // Structure same, only reference changed - prevent re-render
  }

  // 3. Path prop changes don't need re-render (handled via DOM)
  // 4. Handlers don't affect visual output - ignore them

  // All visual props are same - prevent re-render
  return true;
};

export const DocSidebar = memo(DocSidebarComponent, areSidebarPropsEqual);
DocSidebar.displayName = 'DocSidebar';

