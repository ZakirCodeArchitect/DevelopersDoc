"use client"

import React, { useState, useEffect, memo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  // Debug: Log props on mount and when they change
  useEffect(() => {
    console.log('🟡 [DEBUG] DocSidebar props:', {
      isCollapsed,
      hasOnToggleCollapse: !!onToggleCollapse,
      itemsCount: items.length,
    });
  }, [isCollapsed, onToggleCollapse, items.length]);
  
  // Debug: Log transform value
  useEffect(() => {
    console.log('🟡 [DEBUG] Sidebar transform will be:', isCollapsed ? 'translateX(-100%)' : 'translateZ(0)');
  }, [isCollapsed]);
  // Use usePathname() internally if currentPath prop is not provided
  // This allows StableSidebar to avoid re-rendering when pathname changes
  const pathname = usePathname();
  const currentPath = currentPathProp ?? pathname;
  
  // Always use server default for initial state to avoid hydration mismatch
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    return new Set(['Your Docs']); // Always use server-side default initially
  });
  
  const [isHydrated, setIsHydrated] = useState(false);
  const itemsRef = useRef(items);
  const currentPathRef = useRef(currentPath);
  const prevPathRef = useRef<string | undefined>(currentPath);
  const navRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  
  // Keep refs in sync without causing re-renders
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  
  // Update currentPath ref only - no re-renders
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Mark as hydrated and load localStorage (after hydration is complete)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setIsHydrated(true);
      
      // Load from localStorage after hydration
      try {
        const saved = localStorage.getItem('docs-sidebar-expanded');
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          setExpandedItems(new Set(parsed));
        }
      } catch {
        // Keep default if localStorage fails
      }
    }
  }, []);

  // Auto-expand parent section for current path on initial mount only
  useEffect(() => {
    if (!isHydrated || prevPathRef.current || !currentPath) return;
    
    prevPathRef.current = currentPath;

    // Find and expand parent section
    const findParentSection = (navItems: NavItem[], targetPath: string): string | null => {
      for (const item of navItems) {
        if (item.children) {
          const childMatches = item.children.some((child) => {
            if (child.href === targetPath) return true;
            if (child.children) {
              return findParentSection([child], targetPath) !== null;
            }
            return false;
          });
          if (childMatches) return item.label;
          const found = findParentSection(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const parentSection = findParentSection(itemsRef.current, currentPath);
    if (parentSection && !expandedItems.has(parentSection)) {
      setExpandedItems(prev => new Set([...prev, parentSection]));
    }
  }, [isHydrated, currentPath, expandedItems]);

  // Persist expanded items to localStorage - debounced to prevent excessive writes
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem('docs-sidebar-expanded', JSON.stringify(Array.from(expandedItems)));
    }, 100); // Debounce by 100ms

    return () => clearTimeout(timeoutId);
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

  // Check active state using ref (read during initial render only)
  const isActive = (href: string) => {
    const path = currentPathRef.current;
    if (!path) return false;
    // Exact match
    if (path === href) return true;
    // For sub-paths, only match if currentPath starts with href + '/' and href is not just '/docs'
    // This prevents '/docs' from matching '/docs/another-page'
    if (href === '/docs' && path !== '/docs') return false;
    // Allow sub-path matching for other routes (e.g., /docs/projects/project-1 matches /docs/projects)
    return path.startsWith(href + '/');
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
      <div 
        key={item.label} 
        className={cn(
          level > 0 && level === 1 && 'ml-1', 
          level > 1 && 'ml-2',
          !isCollapsibleHeader && 'hover:bg-gray-50/50 rounded px-1 -mx-1'
        )}
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
          {!isCollapsibleHeader && !isProject && !hasChildren && item.label !== 'Dashboard' && <div className="w-5" />}
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
                className={cn(
                  'py-1.5 px-2 text-sm rounded-md truncate flex-1 min-w-0',
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.label}
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
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleExpand(item.label);
                }}
                className="p-1 hover:bg-gray-100 rounded"
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
            <div className="flex-1 flex items-center gap-1 group min-w-0">
            <Link
              href={item.href}
                prefetch={false}
              className={cn(
                  'py-1.5 px-2 text-sm rounded-md truncate flex-1 min-w-0',
                active
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {item.label}
            </Link>
              {item.label === 'Dashboard' && onToggleCollapse && (
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('🔵 [DEBUG] Dashboard collapse button clicked');
                    console.log('🔵 [DEBUG] Event:', e);
                    console.log('🔵 [DEBUG] onToggleCollapse exists:', !!onToggleCollapse);
                    console.log('🔵 [DEBUG] Current isCollapsed state:', isCollapsed);
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔵 [DEBUG] Calling onToggleCollapse...');
                    onToggleCollapse();
                    console.log('🔵 [DEBUG] onToggleCollapse called');
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
      <nav ref={navRef} className="p-4 space-y-1">
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
  // Check if isCollapsed changed - allow re-render if it did
  if (prevProps.isCollapsed !== nextProps.isCollapsed) {
    return false; // Allow re-render
  }

  // First check: Are items exactly the same reference?
  if (prevProps.items === nextProps.items) {
    // Same reference - check if path prop changed (if provided)
    // If currentPath is undefined in both, DocSidebar handles it internally via usePathname
    if (prevProps.currentPath === nextProps.currentPath) {
      return true; // Nothing changed - block re-render
    }
    // Only path prop changed - allow minimal re-render
    return false;
  }

  // Items reference changed - do deep comparison
  if (!deepCompareNavItems(prevProps.items, nextProps.items)) {
    return false; // Structure actually changed - allow re-render
  }

  // Structure is same but reference changed - check path prop
  if (prevProps.currentPath !== nextProps.currentPath) {
    return false; // Path prop changed - allow re-render
  }

  // Same structure, same path prop, same collapse state - block re-render
  // (Pathname changes when currentPath is undefined will be handled by usePathname hook)
  return true;
};

export const DocSidebar = memo(DocSidebarComponent, areSidebarPropsEqual);
DocSidebar.displayName = 'DocSidebar';

