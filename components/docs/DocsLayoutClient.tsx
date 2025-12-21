"use client";

import React, { useMemo, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { DocSidebar, NavItem } from './DocSidebar';
import { DocContent } from './DocContent';
import type { NavLink } from './DocNavigation';
import { DocTableOfContents, TocItem } from './DocTableOfContents';
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

export function DocsLayoutClient({
  sidebarItems,
  processedProjects,
  processedYourDocs,
  children,
}: DocsLayoutClientProps) {
  const currentPath = usePathname();
  const currentPathRef = useRef(currentPath);
  
  // Keep ref in sync without causing re-renders
  React.useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);
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
  // Use a stable key based on the items structure
  const sidebarItemsKey = useMemo(() => {
    return sidebarItems.map(item => `${item.label}:${item.href}:${item.children?.length || 0}`).join('|');
  }, [sidebarItems]);
  
  const memoizedSidebarItems = useMemo(() => {
    return sidebarItems;
  }, [sidebarItemsKey]);

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

  // Memoize children to prevent re-renders when only path changes
  // The children prop changes on every navigation, but we can stabilize it
  const memoizedChildren = useMemo(() => children, [children]);

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
        <DocSidebar 
          items={memoizedSidebarItems} 
          currentPath={currentPath} 
          {...stableHandlers}
        />
        <div className="flex-1 min-h-screen bg-white ml-64">
          {memoizedChildren}
        </div>
      </div>
      <CreateProjectModal />
      <CreateDocModal />
      <RenameModalComponent />
      <DeleteModalComponent />
    </div>
  );
}

