"use client"

import React, { useState, useEffect, memo, useRef } from 'react';
import Link from 'next/link';
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
  onCreateProject?: () => void;
  onCreateDoc?: (projectId?: string, projectName?: string) => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onRenameDoc?: (docId: string, currentName: string, projectId?: string) => void;
  onDeleteDoc?: (docId: string, docName: string, projectId?: string) => void;
}

const DocSidebarComponent: React.FC<DocSidebarProps> = ({
  items,
  currentPath,
  className,
  onCreateProject,
  onCreateDoc,
  onRenameProject,
  onDeleteProject,
  onRenameDoc,
  onDeleteDoc,
}) => {
  // Initialize with default state to avoid hydration mismatch
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Your Docs']));
  const [isHydrated, setIsHydrated] = useState(false);
  const itemsRef = useRef(items);
  
  // Keep items ref in sync without causing re-renders
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Load from localStorage on initial mount only
  useEffect(() => {
    setIsHydrated(true);
    
    // Load from localStorage only once on mount
    const saved = localStorage.getItem('docs-sidebar-expanded');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setExpandedItems(new Set(parsed));
      } catch {
        // If parsing fails, use default
        setExpandedItems(new Set(['Your Docs']));
      }
    } else {
      // Default: expand "Your Docs" and auto-expand parent of current path
      const defaultExpanded = new Set(['Your Docs']);
      
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
        const parentSection = findParentSection(itemsRef.current, currentPath);
        if (parentSection) {
          defaultExpanded.add(parentSection);
        }
      }
      
      setExpandedItems(defaultExpanded);
    }
  }, []); // Only run once on mount

  // Auto-expand parent sections when path changes (but preserve existing expanded items)
  useEffect(() => {
    if (!isHydrated || !currentPath) return;

    // Auto-expand sections that contain the active page
    const findParentSection = (navItems: NavItem[], targetPath: string): string | null => {
      for (const item of navItems) {
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

    const parentSection = findParentSection(itemsRef.current, currentPath);
    if (parentSection) {
      // Only add if not already expanded - preserve existing state
      setExpandedItems(prev => {
        if (prev.has(parentSection)) {
          return prev; // No change needed - return same reference to prevent re-render
        }
        // Only create new Set if we actually need to add something
        const newExpanded = new Set(prev);
        newExpanded.add(parentSection);
        return newExpanded;
      });
    }
  }, [currentPath, isHydrated]); // REMOVED items - use closure to access current items

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
            <div className="flex-1 flex items-center gap-1">
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
              {item.label === 'Projects' && onCreateProject && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateProject();
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
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
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
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
                prefetch={true}
                className={cn(
                  'py-1.5 px-2 text-sm rounded-md transition-colors truncate flex-1 min-w-0',
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
            <div className="flex-1 flex items-center gap-1 group min-w-0">
            <Link
              href={item.href}
                prefetch={true}
              className={cn(
                  'py-1.5 px-2 text-sm rounded-md transition-colors truncate flex-1 min-w-0',
                active
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {item.label}
            </Link>
              {onRenameDoc && onDeleteDoc && !isCollapsibleHeader && (
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

// Custom comparison for DocSidebar to prevent unnecessary re-renders
const areSidebarPropsEqual = (
  prevProps: DocSidebarProps,
  nextProps: DocSidebarProps
) => {
  // Compare currentPath
  if (prevProps.currentPath !== nextProps.currentPath) {
    return false;
  }

  // Compare items by structure (length and keys)
  if (prevProps.items.length !== nextProps.items.length) {
    return false;
  }

  // Compare items by their keys (label, href, children length)
  for (let i = 0; i < prevProps.items.length; i++) {
    const prev = prevProps.items[i];
    const next = nextProps.items[i];
    if (
      prev.label !== next.label ||
      prev.href !== next.href ||
      (prev.children?.length || 0) !== (next.children?.length || 0)
    ) {
      return false;
    }
  }

  // Handler functions are stable (via refs), so we don't need to compare them
  return true;
};

export const DocSidebar = memo(DocSidebarComponent, areSidebarPropsEqual);
DocSidebar.displayName = 'DocSidebar';

