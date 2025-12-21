"use client"

import React, { useState, useEffect, useRef } from 'react';
import { DocSidebar, NavItem } from './DocSidebar';
import { DocContent } from './DocContent';
import type { NavLink } from './DocNavigation';
import { DocTableOfContents, TocItem } from './DocTableOfContents';
import { Header } from '@/components/sections/Header';

interface DocLayoutProps {
  sidebarItems: NavItem[];
  currentPath?: string;
  title: string;
  children: React.ReactNode;
  lastUpdated?: string;
  tocItems?: TocItem[];
  previous?: NavLink;
  next?: NavLink;
  navLinks?: Array<{ label: string; href: string; external?: boolean }>;
  onCreateProject?: () => void;
  onCreateDoc?: (projectId?: string, projectName?: string) => void;
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onRenameDoc?: (docId: string, currentName: string, projectId?: string) => void;
  onDeleteDoc?: (docId: string, docName: string, projectId?: string) => void;
}

export const DocLayout: React.FC<DocLayoutProps> = ({
  sidebarItems,
  currentPath,
  title,
  children,
  lastUpdated,
  tocItems = [],
  previous,
  next,
  navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: 'mailto:zakirmatloob149@gmail.com', external: true },
  ],
  onCreateProject,
  onCreateDoc,
  onRenameProject,
  onDeleteProject,
  onRenameDoc,
  onDeleteDoc,
}) => {
  const [activeTocId, setActiveTocId] = useState<string | undefined>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    // Reset active TOC immediately when title changes (navigation)
    setActiveTocId(undefined);
    
    if (tocItems.length === 0) {
      return;
    }

    // Cleanup previous observer immediately
    if (observerRef.current) {
      elementsRef.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
      observerRef.current.disconnect();
      observerRef.current = null;
      elementsRef.current = [];
    }

    // Use requestAnimationFrame for smoother initialization - runs after paint
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
      }
    );

        const elements: HTMLElement[] = [];
    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
            elements.push(element);
        observer.observe(element);
      }
        });

        observerRef.current = observer;
        elementsRef.current = elements;
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      // Cleanup observer
      if (observerRef.current) {
        elementsRef.current.forEach((element) => {
          observerRef.current?.unobserve(element);
        });
        observerRef.current.disconnect();
        observerRef.current = null;
        elementsRef.current = [];
      }
    };
  }, [tocItems, title]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header
        logoText="Developers Doc"
        navLinks={navLinks}
      />
      <div className="flex flex-1" style={{ fontFamily: 'var(--font-lilex), monospace' }}>
        <DocSidebar 
          items={sidebarItems} 
          currentPath={currentPath} 
          onCreateProject={onCreateProject} 
          onCreateDoc={onCreateDoc}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onRenameDoc={onRenameDoc}
          onDeleteDoc={onDeleteDoc}
        />
        <DocContent
          key={currentPath || title}
          title={title}
          lastUpdated={lastUpdated}
          previous={previous}
          next={next}
        >
          {children}
        </DocContent>
        {tocItems.length > 0 && (
          <DocTableOfContents items={tocItems} activeId={activeTocId} />
        )}
      </div>
    </div>
  );
};

