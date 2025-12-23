"use client";

import React, { useMemo, useRef, useCallback, memo } from 'react';
import { StableSidebar } from './StableSidebar';
import { NavItem } from './DocSidebar';
import { Header } from '@/components/sections/Header';
import type { ProcessedProject, ProcessedYourDoc } from '@/lib/docs';
import { useCreateProject } from './CreateProjectHandler';
import { useCreateDoc } from './CreateDocHandler';
import { useRenameDelete } from './useRenameDelete';

interface DocsLayoutClientProps {
  sidebarItems: NavItem[];
  processedProjects: ProcessedProject[];
  processedYourDocs: ProcessedYourDoc[];
  children: React.ReactNode;
}

// Separate sidebar wrapper that never re-renders
const SidebarWrapper = memo(({ 
  items, 
  handlers 
}: { 
  items: NavItem[]; 
  handlers: any;
}) => {
  return (
    <StableSidebar
      items={items}
      {...handlers}
    />
  );
}, () => true); // NEVER re-render - always return true

SidebarWrapper.displayName = 'SidebarWrapper';

export function DocsLayoutClient({
  sidebarItems,
  processedProjects,
  processedYourDocs,
  children,
}: DocsLayoutClientProps) {
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

  // Memoize sidebar items to prevent re-renders when server component re-executes
  // Use refs to track previous values and only update when structure actually changes
  const prevSidebarItemsRef = useRef<NavItem[]>(sidebarItems);
  const prevKeyRef = useRef<string>('');
  
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
  
  // Only update if structure actually changed
  const memoizedSidebarItems = useMemo(() => {
    if (structureChanged) {
      prevKeyRef.current = currentKey;
      prevSidebarItemsRef.current = sidebarItems;
      return sidebarItems;
    }
    // Return previous reference if structure hasn't changed
    return prevSidebarItemsRef.current;
  }, [sidebarItems, currentKey, structureChanged, buildStructureKey]);

  // Use refs to store handlers - this prevents re-renders when handlers change
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

  // Create stable handler wrappers that use the ref
  const stableHandlers = useMemo(() => ({
    onCreateProject: (...args: Parameters<typeof handleCreateProject>) => handlersRef.current.onCreateProject(...args),
    onCreateDoc: (...args: Parameters<typeof handleCreateDoc>) => handlersRef.current.onCreateDoc(...args),
    onRenameProject: (...args: Parameters<typeof handleRenameProject>) => handlersRef.current.onRenameProject(...args),
    onDeleteProject: (...args: Parameters<typeof handleDeleteProject>) => handlersRef.current.onDeleteProject(...args),
    onRenameDoc: (...args: Parameters<typeof handleRenameDoc>) => handlersRef.current.onRenameDoc(...args),
    onDeleteDoc: (...args: Parameters<typeof handleDeleteDoc>) => handlersRef.current.onDeleteDoc(...args),
  }), []); // Empty deps - these wrappers never change

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
      />
      <div className="flex flex-1" style={{ fontFamily: 'var(--font-lilex), monospace' }}>
        <SidebarWrapper
          items={memoizedSidebarItems}
          handlers={stableHandlers}
        />
        <div className="flex-1 min-h-screen bg-white ml-64">
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

