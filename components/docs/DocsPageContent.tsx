"use client";

import { DocContent } from './DocContent';
import { CodeBlock } from './CodeBlock';
import { InteractiveButton } from './InteractiveButton';
import { DocTableOfContents, TocItem, PageLink } from './DocTableOfContents';
import type { NavLink } from './DocNavigation';
import type { ProcessedDocument, ProcessedProject, ProcessedYourDoc, ProcessedPage } from '@/lib/docs';
import { isProject, isProjectDocument, isPage, getDocumentForPage } from '@/lib/docs';
import { useState, useEffect, useRef, useMemo, memo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateDoc } from './CreateDocHandler';
import { useAddPage } from './AddPageHandler';
import dynamic from 'next/dynamic';

// Dynamically import DocEditor to avoid SSR issues with Tiptap
const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false });

// OPTIMIZATION: Code-split modals - only load when needed
// This reduces initial bundle size by 20-30KB
// PERFORMANCE MONITORING: Track modal load times
const ShareModal = dynamic(
  () => {
    const start = performance.now();
    return import('./ShareModal').then(mod => {
      console.log(`[PERF] ShareModal loaded: ${(performance.now() - start).toFixed(2)}ms`);
      return { default: mod.ShareModal };
    });
  },
  { ssr: false }
);
const PublishModal = dynamic(
  () => {
    const start = performance.now();
    return import('./PublishModal').then(mod => {
      console.log(`[PERF] PublishModal loaded: ${(performance.now() - start).toFixed(2)}ms`);
      return { default: mod.PublishModal };
    });
  },
  { ssr: false }
);

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
        // Preserve all HTML content, including empty paragraphs (<p></p>) for spacing
        // Include if it has content after trimming OR if it contains HTML tags (like <p></p>)
        if (htmlContent.trim() || htmlContent.match(/<[^>]+>/)) {
          html += htmlContent;
        }
      });
    } else if (section.type === 'text' && Array.isArray(section.content)) {
      section.content.forEach((paragraph: string) => {
        // Always include paragraphs, even if empty, to preserve spacing
        html += `<p>${paragraph}</p>`;
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
  processedPublishedDocs?: ProcessedYourDoc[];
  canEdit?: boolean; // If false, user is a viewer and cannot edit
  isOwner?: boolean; // If true, user is the document owner (only owners can publish)
}

const DocsPageContentComponent = ({
  currentPath,
  currentPage,
  processedProjects,
  processedYourDocs,
  processedPublishedDocs = [],
  canEdit = true, // Default to true for backward compatibility
  isOwner = false, // Default to false - only owners can publish
}: DocsPageContentProps) => {
  const [activeTocId, setActiveTocId] = useState<string | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticPage, setOptimisticPage] = useState<ProcessedPage | null>(null);
  // Optimistic pages list for the current document - updates immediately when pages change
  const [optimisticPages, setOptimisticPages] = useState<PageLink[] | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<HTMLElement[]>([]);
  const router = useRouter();
  const isSavingRef = useRef(false);
  const { handleCreateDoc, CreateDocModal } = useCreateDoc();
  const { handleAddPage, AddPageModal } = useAddPage();
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItemId, setShareItemId] = useState<string>('');
  const [shareItemName, setShareItemName] = useState<string>('');
  const [shareType, setShareType] = useState<'document' | 'project'>('document');

  // Publish modal state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishDocumentId, setPublishDocumentId] = useState<string>('');
  const [publishDocumentName, setPublishDocumentName] = useState<string>('');

  // Project members state
  interface ProjectMember {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
    role: 'owner' | 'editor' | 'viewer';
  }
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const handleShareDocument = (documentId: string, documentName: string) => {
    setShareItemId(documentId);
    setShareItemName(documentName);
    setShareType('document');
    setShareModalOpen(true);
  };

  const handleShareProject = (projectId: string, projectName: string) => {
    setShareItemId(projectId);
    setShareItemName(projectName);
    setShareType('project');
    setShareModalOpen(true);
  };

  const handlePublishDocument = (documentId: string, documentName: string) => {
    setPublishDocumentId(documentId);
    setPublishDocumentName(documentName);
    setPublishModalOpen(true);
  };
  
  // Use transition to handle navigation smoothly
  const [isPending, startTransition] = useTransition();
  const [displayContent, setDisplayContent] = useState<{
    path: string;
    page: ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null;
  }>({ path: currentPath, page: currentPage });
  const prevPathRef = useRef(currentPath);
  
  // Update display content when props change, using transition for smooth updates
  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      // Use transition to mark this as a non-urgent update
      startTransition(() => {
        setDisplayContent({ path: currentPath, page: currentPage });
      });
      prevPathRef.current = currentPath;
    } else {
      // Immediate update if path hasn't changed (just data update)
      setDisplayContent({ path: currentPath, page: currentPage });
    }
  }, [currentPath, currentPage, startTransition]);
  
  // Use displayContent for rendering to prevent blinking
  const pageToRender = displayContent.page;
  
  // Debug logging for published routes
  useEffect(() => {
    if (currentPath.startsWith('/docs/published')) {
      console.log('[DEBUG Client] DocsPageContent:', {
        currentPath,
        currentPageProp: !!currentPage,
        displayContentPage: !!displayContent.page,
        pageToRender: !!pageToRender,
        isPage: pageToRender ? isPage(pageToRender) : false,
        sectionsCount: pageToRender && isPage(pageToRender) ? (pageToRender.sections?.length || 0) : 0,
      });
    }
  }, [currentPath, currentPage, displayContent.page, pageToRender]);
  
  // If page not found, show 404
  if (!pageToRender) {
    return (
      <div className="flex flex-1 w-full items-center justify-center">
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

  // Fetch project members when viewing a project
  useEffect(() => {
    const currentPage = displayContent.page;
    if (isProject(currentPage)) {
      const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
          const response = await fetch(`/api/projects/${currentPage.id}/share`);
          const data = await response.json();
          
          if (data.success) {
            const members: ProjectMember[] = [];
            
            // Add owner first
            if (data.owner) {
              members.push({
                id: data.owner.id,
                email: data.owner.email,
                firstName: data.owner.firstName,
                lastName: data.owner.lastName,
                imageUrl: data.owner.imageUrl,
                role: 'owner',
              });
            }
            
            // Add all shared members
            if (data.shares && Array.isArray(data.shares)) {
              data.shares.forEach((share: any) => {
                if (share.sharedWithUser) {
                  members.push({
                    id: share.sharedWithUser.id,
                    email: share.sharedWithUser.email,
                    firstName: share.sharedWithUser.firstName,
                    lastName: share.sharedWithUser.lastName,
                    imageUrl: share.sharedWithUser.imageUrl,
                    role: share.role as 'editor' | 'viewer',
                  });
                } else if (share.email) {
                  // Pending invite (no user yet)
                  members.push({
                    id: share.id,
                    email: share.email,
                    firstName: null,
                    lastName: null,
                    imageUrl: null,
                    role: share.role as 'editor' | 'viewer',
                  });
                }
              });
            }
            
            setProjectMembers(members);
          }
        } catch (error) {
          console.error('Error fetching project members:', error);
        } finally {
          setIsLoadingMembers(false);
        }
      };
      
      fetchMembers();
    } else {
      // Clear members when not viewing a project
      setProjectMembers([]);
    }
  }, [displayContent.page?.id, displayContent.path]);

  // If current page is a project, show project overview with document list
  if (isProject(pageToRender)) {
    return (
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
        <DocContent
          title={pageToRender.title}
          lastUpdated={pageToRender.lastUpdated}
          previous={pageToRender.navigation.previous || undefined}
          next={pageToRender.navigation.next || undefined}
          fullWidth={true}
        >
          {/* Project Description */}
          {pageToRender.description && (
            <div className="mb-8">
              <p className="text-gray-700 text-lg">{pageToRender.description}</p>
            </div>
          )}

          {/* Documents Grid */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              <button
                onClick={() => {
                  // Get project ID from pageToRender (which is a ProcessedProject)
                  handleCreateDoc(pageToRender.id, pageToRender.title);
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
            {pageToRender.documents && pageToRender.documents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {pageToRender.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.href}
                    className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-[#CC561E] hover:shadow-md transition-all duration-200"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#CC561E] transition-colors mb-1" style={{ textDecoration: 'none' }}>
                          {doc.label}
                        </h3>
                        {doc.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
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
                {isLoadingMembers ? (
                  <div className="text-xs text-gray-500">Loading...</div>
                ) : projectMembers.length > 0 ? (
                  <div className="space-y-2">
                    {projectMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        {member.imageUrl ? (
                          <img
                            src={member.imageUrl}
                            alt={member.email}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-gray-600 font-medium">
                              {member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{member.email}</p>
                          <p className="text-[10px] text-gray-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No members</div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pageToRender.documents?.length || 0}
                </p>
              </div>
              {pageToRender.lastUpdated && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Last Updated</p>
                  <p className="text-sm text-gray-700">{pageToRender.lastUpdated}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-auto p-6 pt-8 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <button
              onClick={() => {
                handleShareProject(pageToRender.id, pageToRender.title);
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
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Manage Access
            </button>
          </div>
        </aside>
        <CreateDocModal />
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          type={shareType}
          itemId={shareItemId}
          itemName={shareItemName}
          canShare={canEdit}
        />
        <PublishModal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          documentId={publishDocumentId}
          documentName={publishDocumentName}
        />
      </div>
    );
  }

  // Determine if we're viewing a page, document, or project
  // Use pageToRender for rendering to prevent blinking, but currentPage for optimistic updates
  const isPageView = isPage(pageToRender);
  const basePage = isPageView ? pageToRender : null;
  // Use optimistic page if available, otherwise use the base page
  const page = optimisticPage || basePage;
  // Get document for the page - now includes published docs
  const document = isPageView && page ? getDocumentForPage(page, processedProjects, processedYourDocs, processedPublishedDocs) : null;
  
  // Debug logging for published pages
  if (currentPath.startsWith('/docs/published') && isPageView && page) {
    console.log('[DEBUG Client] Page rendering check:', {
      isPageView,
      hasPage: !!page,
      hasDocument: !!document,
      sectionsCount: page.sections?.length || 0,
    });
  }

  // Optimistic page tracking removed - no debug logs needed

  // Clear optimistic page when server data is refreshed and matches
  // Only clear if the sections actually match (server has caught up)
  useEffect(() => {
    // Don't clear if we're currently saving
    if (isSavingRef.current) return;
    
    if (optimisticPage && basePage && optimisticPage.id === basePage.id) {
      // Check if server data has the same sections (meaning it's been updated)
      const serverSectionsMatch = JSON.stringify(basePage.sections) === JSON.stringify(optimisticPage.sections);
      
      if (serverSectionsMatch) {
        // Server data has caught up, clear optimistic state after a delay
        // This ensures smooth transition from optimistic to server data
        const timeoutId = setTimeout(() => {
          setOptimisticPage(null);
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [basePage, optimisticPage]);

  // Clear optimistic page and pages when path changes (user navigates away)
  useEffect(() => {
    setOptimisticPage(null);
    setOptimisticPages(null);
  }, [currentPath]);

  // Sync optimistic pages with server data when document pages change
  // This ensures optimistic updates are cleared when server data catches up
  useEffect(() => {
    if (!document) {
      // Clear optimistic pages if document is null
      if (optimisticPages) {
        setOptimisticPages(null);
      }
      return;
    }
    
    const serverPages = document.pages.map(p => ({
      id: p.id,
      title: p.title,
      href: p.href,
    }));
    
    if (!optimisticPages) {
      // No optimistic state, nothing to sync
      return;
    }
    
    // Check if server pages match optimistic pages (server has caught up)
    const serverPagesSignature = serverPages.map(p => `${p.id}:${p.title}`).join('|');
    const optimisticPagesSignature = optimisticPages.map(p => `${p.id}:${p.title}`).join('|');
    
    // If server has more pages (new page added) or titles match, clear optimistic state
    if (serverPages.length >= optimisticPages.length) {
      // Check if all optimistic pages exist in server pages with matching titles
      const allMatch = optimisticPages.every(optPage => {
        const serverPage = serverPages.find(sp => sp.id === optPage.id);
        return serverPage && serverPage.title === optPage.title;
      });
      
      if (allMatch && serverPagesSignature === optimisticPagesSignature) {
        // Server data has caught up, clear optimistic state
        setOptimisticPages(null);
      }
    } else if (serverPages.length > optimisticPages.length) {
      // Server has more pages (new page was added), clear optimistic to show all pages
      setOptimisticPages(null);
    }
  }, [document, optimisticPages]);

  // Get TOC items - either from page or empty
  const tocItems: TocItem[] = useMemo(() => {
    if (page) {
      return page.toc;
    }
    return [];
  }, [page]);

  // DEBUG: Check rendered DOM for whitespace issues
  useEffect(() => {
    if (isEditing || !page) return;
    
    // Only run in browser environment
    // Note: Use window.document because local 'document' variable shadows global document
    if (typeof window === 'undefined' || !window.document) return;
    if (!window.document.querySelectorAll || typeof window.document.querySelectorAll !== 'function') return;
    
    // DOM check removed - no longer needed
  }, [page, isEditing, currentPath]);

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
    console.log('🖱️ [CLICK] Save button clicked');
    
    if (!page || !document) {
      console.error('❌ Save failed: Missing page or document!', { page, document });
      return;
    }

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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to save content: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert API response to ProcessedPage format for optimistic update
      if (data.page && page) {
        // Use TOC from API response if available, otherwise generate from sections
        let toc: TocItem[] = [];
        if (data.page.toc && Array.isArray(data.page.toc)) {
          // Use the TOC extracted by the API (includes H2, H3, H4)
          toc = data.page.toc;
        } else {
          // Fallback: generate TOC from sections (for backward compatibility)
          toc = (data.page.sections || []).map((section: any) => ({
            id: section.id,
            label: section.title || '',
            level: 1,
          }));
        }

        // Create optimistic page with updated data, preserving all required properties
        const updatedPage: ProcessedPage = {
          ...page, // Preserves href, navigation, and other properties
          id: page.id,
          title: data.page.title || page.title,
          sections: data.page.sections || page.sections,
          toc,
          href: page.href, // Ensure href is preserved
          navigation: page.navigation, // Ensure navigation is preserved
        };

        // Update optimistic pages list if document exists and page title changed
        if (document && data.page.title && data.page.title !== page.title) {
          setOptimisticPages(
            document.pages.map(p => ({
              id: p.id,
              title: p.id === page.id ? data.page.title : p.title,
              href: p.href,
            }))
          );
        }

        // Mark that we're saving to prevent premature clearing
        isSavingRef.current = true;

        // Set optimistic page FIRST - this will trigger a re-render
        setOptimisticPage(updatedPage);
        
        // Close editor immediately - React will batch these updates
        setIsEditing(false);
        
        // Use requestAnimationFrame to ensure the optimistic update renders first
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Now refresh server data in the background
            // The optimistic content should already be visible
            router.refresh();
            isSavingRef.current = false;
          });
        });
      } else {
        // If no page data, just close editor and refresh
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    }
  }, [page, document, projectId]);

  // Helper function to check if a page is empty
  const isPageEmpty = useMemo(() => {
    if (!page || page.sections.length === 0) return true;
    
    // Check if all sections are empty
    return page.sections.every((section) => {
      if (!Array.isArray(section.content)) return true;
      
      if (section.type === 'html') {
        const html = section.content.join('');
        // Remove HTML tags and check if there's any meaningful content
        const textContent = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return textContent.length === 0;
      }
      
      if (section.type === 'text') {
        return section.content.every((p: string) => !p || p.trim().length === 0);
      }
      
      return true;
    });
  }, [page]);

  // Handle pages - if currentPage is a ProcessedPage, render it
  if (isPageView && page && document) {
    // Hide title if page is empty and title is "Untitled page"
    const shouldHideTitle = isEditing || (isPageEmpty && (page.title === 'Untitled page' || !page.title));
    
    return (
      <div className="flex flex-1 w-full min-h-[calc(100vh-4rem)]">
        <DocContent
          title={page.title}
          lastUpdated={document.lastUpdated}
          previous={page.navigation.previous || undefined}
          next={page.navigation.next || undefined}
          hideTitle={shouldHideTitle}
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
              {/* Show empty state placeholder if page is empty */}
              {isPageEmpty ? (
                <div className="text-center py-16 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {page.title === 'Untitled page' || !page.title ? 'Start writing your page' : 'Add content to your page'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {canEdit 
                      ? (page.title === 'Untitled page' || !page.title 
                          ? 'Add a title and description to get started. You can start writing your documentation content right away.'
                          : 'Click "Edit this page" to add a description and content to your page.')
                      : 'This page is currently empty.'}
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#CC561E] hover:bg-[#B84A17] text-white rounded-md transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      {page.title === 'Untitled page' || !page.title ? 'Start writing documentation' : 'Edit this page'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Render page description (first section without title) above border */}
                  {page.sections.length > 0 && !page.sections[0].title && (
                    <div className="page-description-wrapper pb-5 border-b border-gray-200 mb-8">
                      {page.sections[0].type === 'html' && Array.isArray(page.sections[0].content) && (
                        <div 
                          className="prose prose-gray max-w-none preserve-whitespace"
                          dangerouslySetInnerHTML={{ 
                            __html: page.sections[0].content.join('')
                          }}
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
                            className="prose prose-gray max-w-none preserve-whitespace"
                            dangerouslySetInnerHTML={{ 
                              __html: section.content.join('')
                            }}
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
            </>
          )}
        </DocContent>
        <DocTableOfContents 
          items={tocItems} 
          activeId={activeTocId}
          onAddPage={() => handleAddPage(document.id, document.title, projectId)}
          onEditPage={() => setIsEditing(true)}
          onShare={currentPath.startsWith('/docs/published') ? undefined : () => handleShareDocument(document.id, document.title)}
          onPublish={isOwner ? () => handlePublishDocument(document.id, document.title) : undefined}
          projectName={projectName}
          pages={optimisticPages || (document ? document.pages.map(p => ({
            id: p.id,
            title: p.title,
            href: p.href,
          })) : [])}
          currentPageId={page.id}
          canEdit={canEdit}
        />
        <AddPageModal />
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          type={shareType}
          itemId={shareItemId}
          itemName={shareItemName}
          canShare={canEdit}
        />
        <PublishModal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          documentId={publishDocumentId}
          documentName={publishDocumentName}
        />
      </div>
    );
  }

  // Handle documents (when no specific page is selected) - redirect to first page
  if (currentPage && !isProject(currentPage) && 'pages' in currentPage) {
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

// Helper function to create a signature of pages for comparison
const getPagesSignature = (doc: ProcessedDocument | ProcessedYourDoc): string => {
  if (!doc.pages || doc.pages.length === 0) {
    return '';
  }
  return doc.pages.map(p => `${p.id}:${p.title || ''}`).join('|');
};

// Helper function to create a signature of all documents' pages
const getDocsPagesSignature = (
  projects: ProcessedProject[],
  yourDocs: ProcessedYourDoc[]
): string => {
  const projectPages = projects
    .flatMap(p => p.documents || [])
    .map(d => `${d.id}:${getPagesSignature(d)}`)
    .join('||');
  const yourDocPages = (yourDocs || [])
    .map(d => `${d.id}:${getPagesSignature(d)}`)
    .join('||');
  return `${projectPages}|||${yourDocPages}`;
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

  // Compare currentPage by ID and title (if both exist)
  if (prevProps.currentPage?.id !== nextProps.currentPage?.id) {
    return false;
  }
  
  // Also compare page title if it's a page
  if (prevProps.currentPage && nextProps.currentPage && isPage(prevProps.currentPage) && isPage(nextProps.currentPage)) {
    if (prevProps.currentPage.title !== nextProps.currentPage.title) {
      return false;
    }
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

  // CRITICAL: Compare pages data to detect new pages or title changes
  // This ensures the right sidebar updates when pages are added or titles change
  const prevPagesSignature = getDocsPagesSignature(
    prevProps.processedProjects,
    prevProps.processedYourDocs
  );
  const nextPagesSignature = getDocsPagesSignature(
    nextProps.processedProjects,
    nextProps.processedYourDocs
  );
  if (prevPagesSignature !== nextPagesSignature) {
    return false;
  }

  return true;
};

export const DocsPageContent = memo(DocsPageContentComponent, arePropsEqual);

