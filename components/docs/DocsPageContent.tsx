"use client";

import { DocContent } from './DocContent';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';
import { DocTableOfContents, TocItem, PageLink } from './DocTableOfContents';
import type { NavLink } from './DocNavigation';
import type { ProcessedDocument, ProcessedProject, ProcessedYourDoc, ProcessedPage } from '@/lib/docs';
import { isProject, isProjectDocument, isPage, getDocumentForPage } from '@/lib/docs';
import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useCreateDoc } from './CreateDocHandler';
import { useAddPage } from './AddPageHandler';
import dynamic from 'next/dynamic';

// Dynamically import DocEditor to avoid SSR issues with Tiptap
const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false });

// Helper function to convert page sections to HTML (for Tiptap)
const convertPageToHTML = (page: ProcessedPage) => {
  let html = '';

  // Add page title as H1 at the top (empty if no title)
  html += `<h1>${page.title || ''}</h1>`;
  
  // Track if we found a description (first section without title)
  let hasDescription = false;
  let firstSectionIndex = -1;

  // Find first section without title (this is the description)
  page.sections.forEach((section, index) => {
    if (!section.title && !hasDescription) {
      hasDescription = true;
      firstSectionIndex = index;
      // Add description content
      if (section.type === 'html' && Array.isArray(section.content)) {
        const content = section.content.join('').trim();
        html += content ? content : '<p></p>';
      } else if (section.type === 'text' && Array.isArray(section.content)) {
        const content = section.content.filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
        html += content ? content : '<p></p>';
      }
    }
  });

  // If no description found, add empty paragraph
  if (!hasDescription) {
    html += '<p></p>';
  }

  // Now add rest of the sections (with H2 titles)
  page.sections.forEach((section, index) => {
    // Skip the first section without title (description) as we already added it
    if (index === firstSectionIndex) {
      return;
    }

    // Add section heading only if title exists
    if (section.title) {
      html += `<h2>${section.title}</h2>`;
    }

    // Add section content
    if (section.type === 'html' && Array.isArray(section.content)) {
      section.content.forEach((htmlContent: string) => {
        if (htmlContent.trim()) {
          html += htmlContent;
        }
      });
    } else if (section.type === 'text' && Array.isArray(section.content)) {
      section.content.forEach((paragraph: string) => {
        if (paragraph.trim()) {
          html += `<p>${paragraph}</p>`;
        }
      });
    }
  });

  return html || '<h1></h1><p></p>';
};

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
  const [isEditing, setIsEditing] = useState(false);
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
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]" key={currentPath}>
        <DocContent
          title={currentPage.title}
          lastUpdated={currentPage.lastUpdated}
          previous={currentPage.navigation.previous || undefined}
          next={currentPage.navigation.next || undefined}
          fullWidth={true}
        >
          {/* Project Description */}
          {currentPage.description && (
            <div className="mb-8">
              <p className="text-gray-700 text-lg">{currentPage.description}</p>
            </div>
          )}

          {/* Documents Grid */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
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
              <div className="grid grid-cols-1 gap-4">
                {currentPage.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.href}
                    className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-[#CC561E] hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#CC561E] transition-colors mb-1">
                          {doc.label}
                        </h3>
                        {doc.title && doc.title !== doc.label && (
                          <p className="text-sm text-gray-600 line-clamp-2">{doc.title}</p>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-[#CC561E] transition-colors flex-shrink-0 ml-2"
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
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      {doc.lastUpdated && (
                        <span className="text-xs text-gray-500">
                          Updated {doc.lastUpdated}
                        </span>
                      )}
                      {doc.pages && doc.pages.length > 0 && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
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
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 text-sm mb-2">No documents yet.</p>
                <p className="text-gray-400 text-xs">Click "Add Document" to create your first document.</p>
              </div>
            )}
          </div>
        </DocContent>
        {/* Right Sidebar for Project Overview */}
        <aside className="w-64 border-l border-gray-200 bg-gray-50 fixed right-0 top-16 h-[calc(100vh-4rem)] flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">Project Info</h2>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Members</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src="/icons/googleIcon.png"
                      alt="Gmail"
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <p className="text-xs text-gray-700 truncate">zakirmatloob149@gmail.com</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentPage.documents?.length || 0}
                </p>
              </div>
              {currentPage.lastUpdated && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Last Updated</p>
                  <p className="text-sm text-gray-700">{currentPage.lastUpdated}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto p-6 pt-8 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <button
              onClick={() => {
                // TODO: Implement Manage Project logic
                console.log('Manage Project clicked');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors text-sm font-medium shadow-sm hover:shadow-md"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Manage Project
            </button>
          </div>
        </aside>
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

  // Handle save for editor
  const handleSaveContent = useCallback(async (content: any) => {
    if (!page || !document) return;

    try {
      const apiUrl = `/api/docs/${document.id}/pages/${page.id}`;

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      const data = await response.json();
      
      // Close editor and reload page to show updated content
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    }
  }, [page, document, projectId]);

  // Handle pages - if currentPage is a ProcessedPage, render it
  if (isPageView && page && document) {
    return (
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]" key={currentPath}>
        <DocContent
          title={page.title}
          lastUpdated={document.lastUpdated}
          previous={page.navigation.previous || undefined}
          next={page.navigation.next || undefined}
          hideTitle={isEditing}
          fullWidth={isEditing}
        >
          {/* Show editor or content based on editing state */}
          {isEditing ? (
            <DocEditor
              initialContent={convertPageToHTML(page)}
              onSave={handleSaveContent}
              onClose={() => setIsEditing(false)}
            />
          ) : (
            <>
              {/* Render page description (first section without title) above border */}
              {page.sections.length > 0 && !page.sections[0].title && (
                <div className="page-description-wrapper pb-5 border-b border-gray-200 mb-8">
                  {page.sections[0].type === 'html' && Array.isArray(page.sections[0].content) && (
                    <div 
                      className="prose prose-gray max-w-none"
                      dangerouslySetInnerHTML={{ __html: page.sections[0].content.join('') }}
                    />
                  )}
                  {page.sections[0].type === 'text' && Array.isArray(page.sections[0].content) && (
                    <div>
                      {page.sections[0].content.map((paragraph: string, idx: number) => (
                        <p key={idx} className="text-gray-700 mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Render rest of the sections */}
              {page.sections.map((section, index) => {
                // Skip first section if it's the description (no title)
                if (index === 0 && !section.title) {
                  return null;
                }

                return (
                  <section key={section.id} id={section.id} className="mt-8">
                    {/* Only render title if it exists */}
                    {section.title && (
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                    )}
                    {section.type === 'html' && Array.isArray(section.content) && (
                      <div 
                        className="prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content.join('') }}
                      />
                    )}
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
                );
              })}
            </>
          )}
        </DocContent>
        <DocTableOfContents 
          items={tocItems} 
          activeId={activeTocId}
          onAddPage={() => handleAddPage(document.id, document.title, projectId)}
          onEditPage={() => setIsEditing(true)}
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

