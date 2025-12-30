"use client";

import React, { useMemo, useRef, useCallback, memo, useState } from 'react';
import { StableSidebar } from './StableSidebar';
import { NavItem } from './DocSidebar';
import { Header } from '@/components/sections/Header';
import type { ProcessedProject, ProcessedYourDoc } from '@/lib/docs';
import { SearchModal } from './SearchModal';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';
import { useRenameDelete } from './useRenameDelete';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  
  // CRITICAL: Memoize onToggleCollapse to prevent sidebar re-renders
  const handleToggleCollapse = useCallback(() => {
    console.log('🖱️ [CLICK] Sidebar collapse toggle clicked');
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      
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
    <div className="flex flex-col min-h-screen bg-white">
      <Header
        logoText="Developers Doc"
        navLinks={navLinks}
        projects={processedProjects}
        yourDocs={processedYourDocs}
      />
      <div className="flex flex-1" style={{ fontFamily: 'var(--font-lilex), monospace' }}>
        <StableSidebar
          items={memoizedSidebarItems}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          {...stableHandlers}
        />
        {/* Expand button when collapsed - positioned at same height as Dashboard item */}
        {showExpandButton && isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => {
              setShowExpandButton(false);
              setIsSidebarCollapsed(false);
            }}
            className="fixed left-0 p-1.5 bg-white border border-gray-200 border-l-0 rounded-r-md hover:bg-gray-50 text-gray-600 hover:text-gray-900 shadow-sm z-20 flex items-center justify-center transition-opacity duration-200"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            style={{ 
              top: 'calc(4rem + 1rem + 0.375rem)', // top-16 (header) + p-4 (nav padding) + py-1.5 (item top padding) to align with Dashboard item
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
        <div className={`flex-1 min-h-screen bg-white transition-all duration-300 ${isSidebarCollapsed ? 'ml-0 pl-10' : 'ml-64'}`}>
          {children}
        </div>
      </div>
      <CreateProjectModal />
      <CreateDocModal />
      <RenameModalComponent />
      <DeleteModalComponent />
    </div>
  );
}

