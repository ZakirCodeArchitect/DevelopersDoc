"use client";

import { DocContent } from './DocContent';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';
import { DocTableOfContents, TocItem, PageLink } from './DocTableOfContents';
import type { NavLink } from './DocNavigation';
import type { ProcessedDocument, ProcessedProject, ProcessedYourDoc, ProcessedPage } from '@/lib/docs';
import { isProject, isProjectDocument, isPage, getDocumentForPage } from '@/lib/docs';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useCreateDoc } from './CreateDocHandler';
import { useAddPage } from './AddPageHandler';

interface DocsPageContentProps {
  currentPath: string;
  currentPage: ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null;
  processedProjects: ProcessedProject[];
  processedYourDocs: ProcessedYourDoc[];
}

const DocsPageContentComponent = ({
  currentPath,
  currentPage,
  processedProjects,
  processedYourDocs,
}: DocsPageContentProps) => {
  const [activeTocId, setActiveTocId] = useState<string | undefined>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<HTMLElement[]>([]);
  const { handleCreateDoc, CreateDocModal } = useCreateDoc();
  const { handleAddPage, AddPageModal } = useAddPage();

  // If page not found, show 404
  if (!currentPage) {
    return (
      <div className="flex flex-1 w-full items-center justify-center" key={currentPath}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
          <a
            href="/docs"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Go to Documentation Home
          </a>
        </div>
      </div>
    );
  }

  // If current page is a project, show project overview with document list
  if (isProject(currentPage)) {
    return (
      <div className="flex flex-1 w-full" key={currentPath}>
        <DocContent
          title={currentPage.title}
          lastUpdated={currentPage.lastUpdated}
          previous={currentPage.navigation.previous || undefined}
          next={currentPage.navigation.next || undefined}
        >
          {/* Project Description */}
          {currentPage.description && (
            <div className="mb-8">
              <p className="text-gray-700 text-lg">{currentPage.description}</p>
            </div>
          )}

          {/* List of Documents */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              <button
                onClick={() => {
                  // Get project ID from currentPage (which is a ProcessedProject)
                  handleCreateDoc(currentPage.id, currentPage.title);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                aria-label="Create new document"
                title="Create new document"
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
                Add Document
              </button>
            </div>
            {currentPage.documents && currentPage.documents.length > 0 ? (
              <ul className="space-y-2">
                {currentPage.documents.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.href}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-lg"
                    >
                      {doc.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No documents yet. Click "Add Document" to create one.</p>
            )}
          </div>
        </DocContent>
        <CreateDocModal />
      </div>
    );
  }

  // Determine if we're viewing a page, document, or project
  const isPageView = isPage(currentPage);
  const page = isPageView ? currentPage : null;
  const document = isPageView && page ? getDocumentForPage(page, processedProjects, processedYourDocs) : null;

  // Get TOC items - either from page or empty
  const tocItems: TocItem[] = useMemo(() => {
    if (page) {
      return page.toc;
    }
    return [];
  }, [page]);

  // Get project info if it's a project document
  const { projectId, projectName } = useMemo(() => {
    if (!document) return { projectId: undefined, projectName: undefined };
    
    let projId: string | undefined;
    let projName: string | undefined;
    if (isProjectDocument(document, processedProjects)) {
      for (const project of processedProjects) {
        if (project.documents.some(doc => doc.id === document.id)) {
          projId = project.id;
          projName = project.title;
          break;
        }
      }
    }
    return { projectId: projId, projectName: projName };
  }, [document, processedProjects]);

  // Create stable tocItems key
  const tocItemsKey = useMemo(() => {
    return tocItems.map(item => `${item.id}:${item.label}`).join('|');
  }, [tocItems]);

  // Set up IntersectionObserver for TOC
  useEffect(() => {
    if (tocItems.length === 0) {
      setActiveTocId(prev => prev ? undefined : prev);
      return;
    }

    if (observerRef.current) {
      elementsRef.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
      observerRef.current.disconnect();
      observerRef.current = null;
      elementsRef.current = [];
    }

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const observer = new IntersectionObserver(
          (entries: IntersectionObserverEntry[]) => {
            let maxRatio = 0;
            let activeId: string | undefined;
            
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                const target = entry.target as HTMLElement;
                if (target?.id) {
                  activeId = target.id;
                }
              }
            });

            if (activeId) {
              setActiveTocId(prev => prev === activeId ? prev : activeId);
            }
          },
          {
            rootMargin: '-20% 0px -70% 0px',
            threshold: [0, 0.1, 0.5, 1],
          }
        );

        const elements: HTMLElement[] = [];
        tocItems.forEach((item) => {
          const element = window.document.getElementById(item.id);
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
      if (observerRef.current) {
        elementsRef.current.forEach((element) => {
          observerRef.current?.unobserve(element);
        });
        observerRef.current.disconnect();
        observerRef.current = null;
        elementsRef.current = [];
      }
    };
  }, [tocItemsKey, currentPath]);

  // Handle pages - if currentPage is a ProcessedPage, render it
  if (isPageView && page && document) {
    return (
      <div className="flex flex-1 w-full" key={currentPath}>
        <DocContent
          title={page.title}
          lastUpdated={document.lastUpdated}
          previous={page.navigation.previous || undefined}
          next={page.navigation.next || undefined}
        >
          {/* Render sections within this page */}
          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
              {section.type === 'text' && Array.isArray(section.content) && (
                <div>
                  {section.content.map((paragraph: string, idx: number) => (
                    <p key={idx} className="text-gray-700 mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
              {section.type === 'component' && section.componentType === 'InteractiveButton' && (
                <div className="mt-4">
                  <InteractiveButton />
                </div>
              )}
            </section>
          ))}
        </DocContent>
        <DocTableOfContents 
          items={tocItems} 
          activeId={activeTocId}
          onAddPage={() => handleAddPage(document.id, document.title, projectId)}
          projectName={projectName}
          pages={document.pages.map(p => ({
            id: p.id,
            title: p.title,
            href: p.href,
          }))}
          currentPageId={page.id}
        />
        <AddPageModal />
      </div>
    );
  }

  // Handle documents (when no specific page is selected) - redirect to first page
  if (!isProject(currentPage) && 'pages' in currentPage) {
    const document = currentPage as ProcessedDocument | ProcessedYourDoc;
    if (document.pages.length > 0) {
      // This case shouldn't happen because findDocumentByPath redirects to first page
      // But handle it gracefully by showing first page
      const firstPage = document.pages[0];
      // We should redirect, but for now return 404
    }
  }

  // Fallback - should not happen
  return (
    <div className="flex flex-1 w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (
  prevProps: DocsPageContentProps,
  nextProps: DocsPageContentProps
) => {
  // Compare currentPath (string comparison)
  if (prevProps.currentPath !== nextProps.currentPath) {
    return false;
  }

  // Compare currentPage by ID (if both exist)
  if (prevProps.currentPage?.id !== nextProps.currentPage?.id) {
    return false;
  }

  // If one is null and the other isn't, they're different
  if (!prevProps.currentPage !== !nextProps.currentPage) {
    return false;
  }

  // Compare processedProjects and processedYourDocs by length and IDs
  // Only re-render if the actual data changed, not just the reference
  if (prevProps.processedProjects.length !== nextProps.processedProjects.length) {
    return false;
  }
  if (prevProps.processedYourDocs.length !== nextProps.processedYourDocs.length) {
    return false;
  }

  // Check if any project IDs changed
  const prevProjectIds = prevProps.processedProjects.map(p => p.id).join(',');
  const nextProjectIds = nextProps.processedProjects.map(p => p.id).join(',');
  if (prevProjectIds !== nextProjectIds) {
    return false;
  }

  // Check if any doc IDs changed
  const prevDocIds = prevProps.processedYourDocs.map(d => d.id).join(',');
  const nextDocIds = nextProps.processedYourDocs.map(d => d.id).join(',');
  if (prevDocIds !== nextDocIds) {
    return false;
  }

  return true;
};

export const DocsPageContent = memo(DocsPageContentComponent, arePropsEqual);

