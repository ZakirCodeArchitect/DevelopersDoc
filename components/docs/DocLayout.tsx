"use client"

import React, { useState, useEffect } from 'react';
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
}) => {
  const [activeTocId, setActiveTocId] = useState<string | undefined>();

  useEffect(() => {
    if (tocItems.length === 0) return;

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

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      tocItems.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [tocItems]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header
        logoText="Developers Doc"
        navLinks={navLinks}
      />
      <div className="flex flex-1" style={{ fontFamily: 'var(--font-lilex), monospace' }}>
        <DocSidebar items={sidebarItems} currentPath={currentPath} />
        <DocContent
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

