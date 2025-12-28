"use client";

import { memo } from 'react';
import { DocSidebar, NavItem } from './DocSidebar';

interface StableSidebarProps {
  items: NavItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCreateProject?: () => void;
  onCreateDoc?: (projectId?: string, projectName?: string) => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onRenameDoc?: (docId: string, currentName: string, projectId?: string) => void;
  onDeleteDoc?: (docId: string, docName: string, projectId?: string) => void;
}

// Simple wrapper that never re-renders - DocSidebar handles pathname internally
export const StableSidebar = memo((props: StableSidebarProps) => {
  // Debug: Log props being passed
  console.log('🟠 [DEBUG] StableSidebar rendering with props:', {
    isCollapsed: props.isCollapsed,
    hasOnToggleCollapse: !!props.onToggleCollapse,
    itemsCount: props.items.length,
  });
  
  // DocSidebar will use usePathname() internally, so we don't need to pass currentPath
  // This prevents this component from re-rendering when pathname changes
  return (
    <DocSidebar
      items={props.items}
      isCollapsed={props.isCollapsed}
      onToggleCollapse={props.onToggleCollapse}
      onCreateProject={props.onCreateProject}
      onCreateDoc={props.onCreateDoc}
      onRenameProject={props.onRenameProject}
      onDeleteProject={props.onDeleteProject}
      onRenameDoc={props.onRenameDoc}
      onDeleteDoc={props.onDeleteDoc}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if items, collapse state, or handlers change
  if (prevProps.items !== nextProps.items) {
    return false;
  }
  if (prevProps.isCollapsed !== nextProps.isCollapsed) {
    return false;
  }
  if (
    prevProps.onCreateProject !== nextProps.onCreateProject ||
    prevProps.onCreateDoc !== nextProps.onCreateDoc ||
    prevProps.onRenameProject !== nextProps.onRenameProject ||
    prevProps.onDeleteProject !== nextProps.onDeleteProject ||
    prevProps.onRenameDoc !== nextProps.onRenameDoc ||
    prevProps.onDeleteDoc !== nextProps.onDeleteDoc ||
    prevProps.onToggleCollapse !== nextProps.onToggleCollapse
  ) {
    return false;
  }
  return true; // Prevent re-render
});

StableSidebar.displayName = 'StableSidebar';

