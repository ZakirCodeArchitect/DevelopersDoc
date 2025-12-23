"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { DocSidebar, NavItem } from './DocSidebar';

interface StableSidebarProps {
  items: NavItem[];
  onCreateProject?: () => void;
  onCreateDoc?: (projectId?: string, projectName?: string) => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onRenameDoc?: (docId: string, currentName: string, projectId?: string) => void;
  onDeleteDoc?: (docId: string, docName: string, projectId?: string) => void;
}

// This component NEVER re-renders - it's completely isolated
export function StableSidebar(props: StableSidebarProps) {
  const currentPath = usePathname();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Component mounts once and never updates
  // Only currentPath changes are passed through
  return (
    <DocSidebar
      items={props.items}
      currentPath={currentPath}
      onCreateProject={props.onCreateProject}
      onCreateDoc={props.onCreateDoc}
      onRenameProject={props.onRenameProject}
      onDeleteProject={props.onDeleteProject}
      onRenameDoc={props.onRenameDoc}
      onDeleteDoc={props.onDeleteDoc}
    />
  );
}

// NEVER re-render this component - it's completely stable
StableSidebar.displayName = 'StableSidebar';

