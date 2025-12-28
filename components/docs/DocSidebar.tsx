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
  
  // Debug: Log transform value
  useEffect(() => {
    console.log('🟡 [DEBUG] Sidebar transform will be:', isCollapsed ? 'translateX(-100%)' : 'translateZ(0)');
  }, [isCollapsed]);
  
  // Get initial pathname from window.location to avoid usePathname() re-renders
  const getInitialPathname = () => {
    if (typeof window === 'undefined') return '/docs';
    return window.location.pathname;
  };
  
  const pathnameRef = useRef(getInitialPathname());
  // Use currentPathProp if provided, otherwise use the ref (which will be updated via DOM)
  const currentPath = currentPathProp ?? pathnameRef.current;
  
  // Always use server default for initial state to avoid hydration mismatch
  // We'll update from localStorage after hydration, but suppress transitions during that update
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    return new Set(['Your Docs']); // Always use server-side default initially
  });
  
  const [isHydrated, setIsHydrated] = useState(false);
  const itemsRef = useRef(items);
  const currentPathRef = useRef(currentPath);
  const prevPathRef = useRef<string | undefined>(currentPath);
  const navRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  const forceUpdateRef = useRef(0);
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
  
  // Subscribe to pathname changes and update DOM without re-rendering
  useEffect(() => {
    if (!navRef.current || typeof window === 'undefined' || !isHydrated) return;
    
    const updateActiveStates = () => {
      // Check if navRef is still available (it might be null if component unmounted)
      if (!navRef.current || typeof window === 'undefined') return;
      
      // Read pathname directly from window to avoid React re-renders
      const newPathname = window.location.pathname;
      pathnameRef.current = newPathname;
      const currentPathValue = currentPathProp ?? newPathname;
      
      // Update active states via DOM manipulation to avoid React re-render
      // Remove active class from all links first
      const navElement = navRef.current;
      if (!navElement) return;
      
      navElement.querySelectorAll('[data-nav-href]').forEach((link) => {
        link.classList.remove('bg-blue-50', 'text-blue-600', 'font-medium');
        link.classList.add('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
      });
      
      // Add active class to current active items (exact match)
      const activeLinks = navElement.querySelectorAll(`[data-nav-href="${currentPathValue}"]`);
      activeLinks.forEach(link => {
        link.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
        link.classList.remove('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
      });
      
      // Also handle sub-path matching
      navElement.querySelectorAll('[data-nav-href]').forEach((link) => {
        const href = link.getAttribute('data-nav-href');
        if (!href || href === currentPathValue) return;
        
        // Check if this href should be active (sub-path match)
        if (href === '/docs' && currentPathValue !== '/docs') return;
        if (currentPathValue.startsWith(href + '/')) {
          link.classList.add('bg-blue-50', 'text-blue-600', 'font-medium');
          link.classList.remove('text-gray-700', 'hover:bg-gray-100', 'hover:text-gray-900');
        }
      });
      
      // Update ref after DOM manipulation
      const prevPath = currentPathRef.current;
      currentPathRef.current = currentPathValue;
      
      
      // Auto-expand for the new path (this will only update state if needed)
      // Only call if path actually changed to avoid unnecessary checks
      if (prevPath !== currentPathValue) {
        autoExpandForPath(currentPathValue);
      }
    };
    
    // Initial update after a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateActiveStates();
    }, 0);
    
    // Subscribe to pathname changes via Next.js router events
    // Use a small interval to check for pathname changes (Next.js doesn't expose router events in app router)
    const intervalId = setInterval(() => {
      if (!navRef.current || typeof window === 'undefined') return;
      const newPathname = window.location.pathname;
      if (newPathname !== pathnameRef.current) {
        updateActiveStates();
      }
    }, 100); // Check every 100ms
    
    // Listen to popstate for back/forward navigation
    const handlePopState = () => {
      setTimeout(updateActiveStates, 10);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Listen to pushstate/replacestate by intercepting history methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updateActiveStates, 10);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateActiveStates, 10);
    };
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [currentPathProp, isHydrated]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!initializedRef.current && typeof window !== 'undefined') {
      initializedRef.current = true;
      setIsHydrated(true);
      
      try {
        const saved = localStorage.getItem('docs-sidebar-expanded');
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          setExpandedItems(new Set(parsed));
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, []);

  // Auto-expand logic - moved to DOM update effect to avoid re-renders
  // This will be called from the pathname change handler
  const autoExpandForPath = (targetPath: string) => {
    if (!isHydrated || typeof window === 'undefined') return;
    
    // Read current expanded items from ref (always up-to-date)
    const currentExpanded = expandedItemsRef.current;
    
    // Track path changes to auto-expand on navigation
    const pathChanged = prevPathRef.current !== targetPath;
    const isInitialMount = prevPathRef.current === undefined;
    
    // Only run on initial mount or when path actually changes
    if (!isInitialMount && !pathChanged) return;
    
    prevPathRef.current = targetPath;

    // Find and expand parent sections and active project
    // CRITICAL: Never include "Projects" or "Your Docs" in parentSections - they are manual-only
    const findParentSectionsAndProject = (navItems: NavItem[], targetPath: string, parentLabels: string[] = []): { parentSections: string[]; activeProject: string | null } => {
      let parentSections: string[] = [];
      let activeProject: string | null = null;
      
      for (const item of navItems) {
        // CRITICAL: Skip "Projects" and "Your Docs" headers - never include them in parent sections
        if (item.label === 'Projects' || item.label === 'Your Docs') {
          // Still check children, but don't add this item to parentLabels
          if (item.children) {
            const found = findParentSectionsAndProject(item.children, targetPath, parentLabels); // Don't add item.label
            if (found.activeProject) {
              activeProject = found.activeProject;
              parentSections = [...parentLabels, ...found.parentSections];
            } else if (found.parentSections.length > 0) {
              parentSections = [...parentLabels, ...found.parentSections];
            }
          }
          continue; // Skip processing this item as a parent
        }
        
        // Check if this item is the active project
        const pathSegments = item.href.split('/').filter(Boolean);
        const isProject = pathSegments.length === 3 && pathSegments[0] === 'docs' && pathSegments[1] === 'projects';
        
        if (isProject && (targetPath === item.href || targetPath.startsWith(item.href + '/'))) {
          activeProject = item.label;
          // If we found the active project, all its parents should be expanded (but not "Projects" or "Your Docs")
          parentSections = [...parentLabels];
        }
        
        if (item.children) {
          // Recursively check children, passing current item as a potential parent
          const found = findParentSectionsAndProject(item.children, targetPath, [...parentLabels, item.label]);
          if (found.activeProject) {
            activeProject = found.activeProject;
            // If we found the project in children, this item and all its parents should be expanded
            parentSections = [...parentLabels, item.label, ...found.parentSections];
          } else if (found.parentSections.length > 0) {
            // If a child found parent sections, this item is also a parent
            parentSections = [...parentLabels, item.label, ...found.parentSections];
          }
        }
      }
      
      return { parentSections, activeProject };
    };

    const { parentSections, activeProject } = findParentSectionsAndProject(itemsRef.current, targetPath);
    const itemsToExpand: string[] = [];
    
    // IMPORTANT: Completely remove "Projects" and "Your Docs" from auto-expand logic
    // These should ONLY be toggled manually by the user - never touched by auto-expand
    const filteredParentSections = parentSections.filter(
      section => section !== 'Projects' && section !== 'Your Docs'
    );
    
    for (const section of filteredParentSections) {
      if (!currentExpanded.has(section)) {
        itemsToExpand.push(section);
      }
    }
    // Add active project if it needs expansion
    // But don't auto-expand if it was manually collapsed by the user
    if (activeProject && !currentExpanded.has(activeProject) && !manuallyCollapsedRef.current.has(activeProject)) {
      itemsToExpand.push(activeProject);
    }
    
    // Only update state if there are items to expand (avoid unnecessary re-renders)
    // This ensures we never collapse anything, only expand when needed
    // CRITICAL: Never update state if it would affect "Projects" or "Your Docs"
    // These headers are manual-only and should never be touched by auto-expand
    if (itemsToExpand.length > 0) {
      // Double-check that we're not trying to expand "Projects" or "Your Docs"
      const safeItemsToExpand = itemsToExpand.filter(
        item => item !== 'Projects' && item !== 'Your Docs'
      );
      
      if (safeItemsToExpand.length > 0) {
        setExpandedItems(prev => {
          // Check if any items actually need to be added (avoid state update if already expanded)
          const needsUpdate = safeItemsToExpand.some(item => !prev.has(item));
          if (!needsUpdate) {
            return prev; // Return same reference to prevent re-render
          }
          // Create new set with only the safe items to expand
          // "Projects" and "Your Docs" are automatically preserved since we're not touching them
          return new Set([...prev, ...safeItemsToExpand]);
        });
      }
    }
  };

  // Persist expanded items to localStorage - debounced to prevent excessive writes
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    
    const timeoutId = setTimeout(() => {
      const itemsArray = Array.from(expandedItems);
      localStorage.setItem('docs-sidebar-expanded', JSON.stringify(itemsArray));
    }, 100); // Debounce by 100ms

    return () => clearTimeout(timeoutId);
  }, [expandedItems, isHydrated]);

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
      <nav ref={navRef} className="p-4 pb-20 space-y-1">
        {items.map((item) => renderNavItem(item))}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <button
          type="button"
          onClick={() => {
            // TODO: Implement settings logic
            console.log('Settings clicked');
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

