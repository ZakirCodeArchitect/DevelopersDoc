"use client";

import { memo } from 'react';
import { DocSidebar, NavItem } from './DocSidebar';

// Deep comparison function for NavItem arrays (same as in DocSidebar)
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

// Memoized wrapper that prevents unnecessary re-renders
// Only re-renders when visual props (items structure or collapse state) actually change
export const StableSidebar = memo((props: StableSidebarProps) => {
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
  // Only re-render if visual props changed
  // 1. Check collapse state
  if (prevProps.isCollapsed !== nextProps.isCollapsed) {
    return false; // Allow re-render
  }
  
  // 2. Check items - do deep comparison (reference might change but structure same)
  if (prevProps.items !== nextProps.items) {
    // Reference changed - check if structure actually changed
    if (!deepCompareNavItems(prevProps.items, nextProps.items)) {
      return false; // Structure changed - allow re-render
    }
    // Structure same, only reference changed - prevent re-render
  }
  
  // All visual props are same - prevent re-render (ignore handler changes)
  return true;
});

StableSidebar.displayName = 'StableSidebar';

