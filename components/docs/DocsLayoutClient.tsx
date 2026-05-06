"use client";

import React, { useMemo, useRef, useCallback, useState } from 'react';
import { NavItem } from './DocSidebar';
import { Header } from '@/components/sections/Header';
import type { ProcessedProject, ProcessedYourDoc } from '@/lib/docs';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';
import { useRenameDelete } from './useRenameDelete';
import { NavigationProvider, DocsContentArea } from './NavigationContext';
import { StableSidebar } from './StableSidebar';

// Keep desktop sidebar state stable across client remounts during route transitions.
let cachedSidebarCollapsed: boolean | null = null;

interface DocsLayoutClientProps {
  sidebarItems: NavItem[];
  processedProjects: ProcessedProject[];
  processedYourDocs: ProcessedYourDoc[];
  children: React.ReactNode;
}

export function DocsLayoutClient({
  sidebarItems,
  processedProjects,
  processedYourDocs,
  children,
}: DocsLayoutClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(cachedSidebarCollapsed ?? false);
  const [showExpandButton, setShowExpandButton] = useState(cachedSidebarCollapsed ?? false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const hasSearchData = processedProjects.length > 0 || processedYourDocs.length > 0;

  // Hydration-safe restore: keep server/client initial markup identical,
  // then sync persisted state before first paint on the client.
  React.useLayoutEffect(() => {
    if (cachedSidebarCollapsed !== null) {
      setIsSidebarCollapsed(cachedSidebarCollapsed);
      setShowExpandButton(cachedSidebarCollapsed);
      return;
    }
    try {
      const collapsed = localStorage.getItem('docs-left-sidebar-collapsed') === 'true';
      cachedSidebarCollapsed = collapsed;
      setIsSidebarCollapsed(collapsed);
      setShowExpandButton(collapsed);
    } catch {
      // ignore storage failures
    }
  }, []);
  
  // CRITICAL: Memoize onToggleCollapse to prevent sidebar re-renders
  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      cachedSidebarCollapsed = newValue;
      try {
        localStorage.setItem('docs-left-sidebar-collapsed', String(newValue));
      } catch {
        // ignore storage failures
      }
      
      // If collapsing, show expand button after animation completes (300ms)
      if (newValue) {
        setShowExpandButton(false);
        setTimeout(() => {
          setShowExpandButton(true);
        }, 300);
      } else {
        // If expanding, hide button immediately
        setShowExpandButton(false);
      }
      
      return newValue;
    });
  }, []);
  const { handleCreateProject, CreateProjectModal } = useCreateProject();
  const { handleCreateDoc, CreateDocModal } = useCreateDoc();
  const {
    handleRenameProject,
    handleRenameDoc,
    handleDeleteProject,
    handleDeleteDoc,
    RenameModal: RenameModalComponent,
    DeleteModal: DeleteModalComponent,
  } = useRenameDelete();

  // ULTRA-STABLE: Memoize sidebar items to prevent re-renders when server component re-executes
  // Use refs to track previous values and only update when structure actually changes
  const prevSidebarItemsRef = useRef<NavItem[]>(sidebarItems);
  const prevKeyRef = useRef<string>('');
  const stableItemsRef = useRef<NavItem[]>(sidebarItems);
  
  // Create a deep comparison key based on the entire structure
  const buildStructureKey = useCallback((items: NavItem[]): string => {
    const buildKey = (item: NavItem): string => {
      let key = `${item.label}:${item.href}`;
      if (item.children) {
        key += `:[${item.children.map(buildKey).join(',')}]`;
      }
      return key;
    };
    return items.map(buildKey).join('|');
  }, []);
  
  const currentKey = buildStructureKey(sidebarItems);
  const structureChanged = currentKey !== prevKeyRef.current;
  
  // Only update if structure actually changed - otherwise return stable reference
  const memoizedSidebarItems = useMemo(() => {
    if (structureChanged) {
      prevKeyRef.current = currentKey;
      prevSidebarItemsRef.current = sidebarItems;
      stableItemsRef.current = sidebarItems;
      return sidebarItems;
    }
    // CRITICAL: Return the stable reference from ref, not from prevSidebarItemsRef
    // This ensures React sees the same reference even if sidebarItems prop changes
    return stableItemsRef.current;
  }, [sidebarItems, currentKey, structureChanged, buildStructureKey]);

  // ULTRA-STABLE: Use refs to store handlers - this prevents re-renders when handlers change
  const handlersRef = useRef({
    onCreateProject: handleCreateProject,
    onCreateDoc: handleCreateDoc,
    onRenameProject: handleRenameProject,
    onDeleteProject: handleDeleteProject,
    onRenameDoc: handleRenameDoc,
    onDeleteDoc: handleDeleteDoc,
  });

  // Update ref when handlers change (but don't cause re-render)
  React.useEffect(() => {
    handlersRef.current = {
      onCreateProject: handleCreateProject,
      onCreateDoc: handleCreateDoc,
      onRenameProject: handleRenameProject,
      onDeleteProject: handleDeleteProject,
      onRenameDoc: handleRenameDoc,
      onDeleteDoc: handleDeleteDoc,
    };
  }, [handleCreateProject, handleCreateDoc, handleRenameProject, handleDeleteProject, handleRenameDoc, handleDeleteDoc]);

  // Create stable handler wrappers that use the ref - these NEVER change
  // Using useRef instead of useMemo to ensure absolute stability
  const stableHandlersRef = useRef({
    onCreateProject: (...args: Parameters<typeof handleCreateProject>) => handlersRef.current.onCreateProject(...args),
    onCreateDoc: (...args: Parameters<typeof handleCreateDoc>) => handlersRef.current.onCreateDoc(...args),
    onRenameProject: (...args: Parameters<typeof handleRenameProject>) => handlersRef.current.onRenameProject(...args),
    onDeleteProject: (...args: Parameters<typeof handleDeleteProject>) => handlersRef.current.onDeleteProject(...args),
    onRenameDoc: (...args: Parameters<typeof handleRenameDoc>) => handlersRef.current.onRenameDoc(...args),
    onDeleteDoc: (...args: Parameters<typeof handleDeleteDoc>) => handlersRef.current.onDeleteDoc(...args),
  });
  
  // Return the stable handlers from ref
  const stableHandlers = stableHandlersRef.current;

  // DON'T memoize children - it changes on every navigation and that's expected
  // The sidebar is isolated and won't re-render when children changes
  // because it's a separate component with its own memo

  // Memoize navLinks to prevent Header re-renders
  const navLinks = useMemo(() => [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: 'mailto:zakirmatloob149@gmail.com', external: true },
  ], []);

  return (
    <NavigationProvider>
      <div className="docs-ui flex flex-col min-h-screen bg-white">
        <Header
          logoText="Developers Doc"
          navLinks={navLinks}
          projects={processedProjects}
          yourDocs={processedYourDocs}
        />
        <div className="flex flex-1" style={{ fontFamily: 'var(--font-lilex), monospace' }}>
          <StableSidebar
            items={memoizedSidebarItems}
            className="hidden md:flex"
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            {...stableHandlers}
          />
          {isMobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/40 md:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
                aria-hidden
              />
              <StableSidebar
                items={memoizedSidebarItems}
                className="!flex md:!hidden !w-[82vw] !max-w-[320px] !top-16 !h-[calc(100vh-4rem)] !z-40 shadow-xl"
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapse}
                {...stableHandlers}
              />
            </>
          )}
          {showExpandButton && isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => {
                setShowExpandButton(false);
                setIsSidebarCollapsed(false);
                cachedSidebarCollapsed = false;
                try {
                  localStorage.setItem('docs-left-sidebar-collapsed', 'false');
                } catch {
                  // ignore storage failures
                }
              }}
              className="fixed left-0 p-1.5 bg-white border border-gray-200 border-l-0 rounded-r-md hover:bg-gray-50 text-gray-600 hover:text-gray-900 shadow-sm z-20 hidden md:flex items-center justify-center transition-opacity duration-200"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              style={{
                top: 'calc(4rem + 1rem + 0.375rem)',
              }}
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          <div className={`flex-1 min-h-screen bg-white transition-all duration-300 ${isSidebarCollapsed ? 'ml-0 md:pl-10' : 'ml-0 md:ml-64'}`}>
            <DocsContentArea>{children}</DocsContentArea>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="fixed left-4 bottom-4 z-30 md:hidden rounded-full border border-gray-200 bg-white p-3 text-gray-700 shadow-md hover:bg-gray-50"
            aria-label={isMobileSidebarOpen ? 'Close left sidebar' : 'Open left sidebar'}
            title={isMobileSidebarOpen ? 'Close left sidebar' : 'Open left sidebar'}
          >
            {isMobileSidebarOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v14H4zM13 7h7M13 12h7M13 17h7" />
              </svg>
            )}
          </button>
          {hasSearchData && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('open-docs-search'));
              }}
              className="fixed left-1/2 bottom-4 z-30 -translate-x-1/2 md:hidden inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-md hover:bg-gray-50"
              aria-label="Search documentation"
              title="Search documentation"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
              </svg>
              <span>Search docs</span>
            </button>
          )}
        </div>
        <CreateProjectModal />
        <CreateDocModal />
        <RenameModalComponent />
        <DeleteModalComponent />
      </div>
    </NavigationProvider>
  );
}

