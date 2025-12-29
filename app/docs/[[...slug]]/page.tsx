import {
  processProjects,
  processYourDocs,
  processPublishedDocs,
  findDocumentByPath,
  isPage,
  type ProcessedDocument,
  type ProcessedProject,
  type ProcessedYourDoc,
  type ProcessedPage,
  type YourDocData,
} from '@/lib/docs';
import type { NavLink } from '@/components/docs/DocNavigation';
import { getAllDocsNavData, getAllPublishedDocsNav, getPageWithSections } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';
import { DocsPageContent } from '@/components/docs/DocsPageContent';
import { DocsLandingPage } from '@/components/docs/DocsLandingPage';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/db';

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  // Check if this is a published doc route early to avoid unnecessary data fetching
  const isPublishedRoute = currentPath.startsWith('/docs/published/');

  // NAV-ONLY dataset (no sections) for fast navigation and small payloads
  // For published routes, we can skip fetching shared docs to avoid Prisma errors
  let data;
  try {
    data = await getAllDocsNavData(user.id);
  } catch (error) {
    // If getAllDocsNavData fails (e.g., Share model not available), use minimal data
    console.warn('Error fetching all docs nav data, using minimal data:', error);
    const [ownedProjects, ownedYourDocs] = await Promise.all([
      (await import('@/lib/db')).getAllProjectsNav(user.id),
      (await import('@/lib/db')).getAllYourDocsNav(user.id),
    ]);
    data = {
      projects: ownedProjects,
      yourDocs: ownedYourDocs,
      ownership: {
        ownedProjectIds: new Set(ownedProjects.map(p => p.id)),
        ownedDocIds: new Set(ownedYourDocs.map(d => d.id)),
        ownedProjectDocumentIds: new Set(ownedProjects.flatMap(p => p.documents.map(d => d.id))),
      },
    };
  }
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  // Fetch published documents
  let processedPublishedDocs: ProcessedYourDoc[] = [];
  let publishedDocsData: { documents: YourDocData[]; publishSlugs: Map<string, string> } = {
    documents: [],
    publishSlugs: new Map(),
  };
  
  try {
    publishedDocsData = await getAllPublishedDocsNav();
    processedPublishedDocs = processPublishedDocs(
      publishedDocsData.documents,
      publishedDocsData.publishSlugs
    );
  } catch (error) {
    // If published docs can't be fetched (e.g., schema not migrated), just continue without them
    console.error('Error fetching published docs:', error);
    processedPublishedDocs = [];
    publishedDocsData = { documents: [], publishSlugs: new Map() };
  }

  // Find the current page (including published docs)
  let currentPage = findDocumentByPath(currentPath, processedProjects, processedYourDocs, processedPublishedDocs);
  
  // Debug logging
  if (isPublishedRoute) {
    console.log('[DEBUG] Published route:', {
      currentPath,
      foundPage: !!currentPage,
      isPage: currentPage ? isPage(currentPage) : false,
      hasSections: currentPage && isPage(currentPage) ? (currentPage.sections?.length || 0) : 0,
    });
  }
  
  // If navigating to /docs/published (list view), show published docs list
  if (currentPath === '/docs/published') {
    const { PublishedDocsList } = await import('@/components/docs/PublishedDocsList');
    return <PublishedDocsList />;
  }

  // If not found and it's a published route, try fetching by page ID as fallback
  // This handles cases where the page might not be in processedPublishedDocs yet
  // OR if the page was found but has empty sections (nav-only data)
  const needsFallbackFetch = !currentPage || (currentPage && isPage(currentPage) && (!currentPage.sections || currentPage.sections.length === 0));
  
  if (needsFallbackFetch && isPublishedRoute) {
    const publishedPath = currentPath.replace('/docs/published/', '');
    const pathParts = publishedPath.split('/').filter(Boolean);
    
    if (pathParts.length === 0) {
      redirect('/docs');
    }
    
    // Get the page ID (last part of the path)
    const pageId = pathParts[pathParts.length - 1];
    
    // Validate that pageId looks like a UUID
    if (!pageId || pageId.length < 10) {
      redirect('/docs');
    }
    
    // Fetch the page directly by ID with sections and document
    let pageData;
    try {
      pageData = await prisma.page.findUnique({
        where: { id: pageId },
        include: {
          sections: {
            orderBy: { createdAt: 'asc' },
          },
          document: {
            include: {
              pages: {
                orderBy: { pageNumber: 'asc' },
                select: {
                  id: true,
                  title: true,
                  pageNumber: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching page by ID:', error);
      redirect('/docs');
    }
    
    if (!pageData || !pageData.document) {
      redirect('/docs');
    }
    
    // Check if the document is published - try PublishedDocument table
    let isPublished = false;
    try {
      // Try to find in PublishedDocument table
      const pubDoc = await (prisma as any).publishedDocument?.findUnique({
        where: { documentId: pageData.documentId },
      });
      isPublished = !!pubDoc;
    } catch (error) {
      // If PublishedDocument table doesn't exist or query fails, redirect
      console.error('Error checking published status:', error);
      redirect('/docs');
    }
    
    if (!isPublished) {
      redirect('/docs');
    }
    
    // Create the processed page directly from the fetched data
    const doc = pageData.document;
    const allPages = doc.pages || [];
    const currentPageIndex = allPages.findIndex((p: any) => p.id === pageId);
    
    // Generate TOC from sections
    const toc = pageData.sections.map((s: any) => ({
      id: s.id,
      label: s.title,
      level: 1,
    }));
    
    // Generate navigation (previous/next) using page IDs directly
    const previous: NavLink | null = currentPageIndex > 0
      ? {
          label: allPages[currentPageIndex - 1].title,
          href: `/docs/published/${allPages[currentPageIndex - 1].id}`,
        }
      : null;
    const next: NavLink | null = currentPageIndex < allPages.length - 1
      ? {
          label: allPages[currentPageIndex + 1].title,
          href: `/docs/published/${allPages[currentPageIndex + 1].id}`,
        }
      : null;
    
    // Set currentPage directly with all the data
    currentPage = {
      id: pageData.id,
      title: pageData.title,
      pageNumber: pageData.pageNumber,
      href: currentPath,
      sections: pageData.sections.map((s: any) => ({
        id: s.id,
        title: s.title,
        type: s.type as 'text' | 'html' | 'component',
        content: s.content,
        componentType: s.componentType || undefined,
      })),
      toc,
      navigation: {
        previous,
        next,
      },
    } as ProcessedPage;
  }

  // If navigating to /docs/published (list view), show published docs list
  if (currentPath === '/docs/published') {
    // Import and render the published docs list component
    const { PublishedDocsList } = await import('@/components/docs/PublishedDocsList');
    return <PublishedDocsList />;
  }

  // If navigating to /docs and no page found, show landing page
  if (!currentPage && currentPath === '/docs') {
    return (
      <DocsLandingPage
        processedProjects={processedProjects}
        processedYourDocs={processedYourDocs}
      />
    );
  }

  // If page not found, redirect to /docs
  if (!currentPage) {
    redirect('/docs');
  }

  // If accessing a document directly (not a page), redirect to first page
  if (currentPage && !isPage(currentPage) && 'pages' in currentPage) {
    const doc = currentPage as ProcessedDocument | ProcessedYourDoc;
    if (doc.pages.length > 0) {
      redirect(doc.pages[0].href);
    }
  }

  // If this is a page, fetch its sections only (content) and patch into the processed page.
  // This avoids loading ALL sections for ALL docs on every navigation.
  let canEdit = true; // Default to true (owner or editor)
  let isOwner = false; // Track if user is the document owner (only owners can publish)
  
  // Published docs are always view-only
  if (isPublishedRoute) {
    canEdit = false;
    isOwner = false;
  }
  
  if (currentPage && isPage(currentPage)) {
    // For published pages found in nav data, they have empty sections - always fetch them
    // For regular pages, fetch sections if needed
    const isPublishedPageWithEmptySections = isPublishedRoute && (!currentPage.sections || currentPage.sections.length === 0);
    
    // Only fetch sections if:
    // 1. It's a published page with empty sections (from nav data)
    // 2. It's a regular (non-published) page (always fetch for access control)
    // Skip fetching if published page already has sections (from fallback logic above)
    const shouldFetchSections = (isPublishedRoute && isPublishedPageWithEmptySections) || !isPublishedRoute;
    
    let fullPage: any;
    if (shouldFetchSections) {
      if (isPublishedRoute) {
        fullPage = await (async () => {
          try {
            const page = await prisma.page.findUnique({
              where: { id: currentPage.id },
              include: {
                sections: {
                  orderBy: { createdAt: 'asc' },
                },
                document: {
                  select: {
                    id: true,
                  },
                },
              },
            });
            
            if (!page || !page.document) {
              console.error('Page or document not found:', { pageId: currentPage.id, hasPage: !!page });
              return null;
            }
            
            // Check if document is published by querying PublishedDocument table
            try {
              const pubDoc = await (prisma as any).publishedDocument?.findUnique({
                where: { documentId: page.document.id },
              });
              
              if (!pubDoc) {
                console.error('Document is not published:', { documentId: page.document.id });
                return null;
              }
            } catch (pubError) {
              console.error('Error checking published status:', pubError);
              return null;
            }
            
            return {
              id: page.id,
              title: page.title,
              pageNumber: page.pageNumber,
              sections: (page.sections || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                type: s.type as 'text' | 'html' | 'component',
                content: s.content,
                componentType: s.componentType || undefined,
              })),
            };
          } catch (error) {
            console.error('Error fetching published page:', error);
            return null;
          }
        })();
      } else {
        fullPage = await getPageWithSections(currentPage.id, user.id);
      }
    } else {
      // If published page already has sections (from fallback), use it as-is
      fullPage = currentPage as ProcessedPage;
    }
      
    // If page sections cannot be fetched (page doesn't exist or no access), redirect to /docs
    if (!fullPage) {
      console.error('[DEBUG] fullPage is null, redirecting:', { 
        currentPageId: currentPage?.id,
        isPublishedRoute,
        shouldFetchSections 
      });
      redirect('/docs');
    }
    
    // Update currentPage with fetched sections
    // fullPage can be either:
    // 1. A fetched page object with { id, title, pageNumber, sections }
    // 2. A ProcessedPage (from fallback logic when page already has sections)
    if (fullPage) {
      // Check if fullPage is already a ProcessedPage (has href, toc, navigation)
      if (isPage(fullPage) && 'href' in fullPage && 'toc' in fullPage) {
        // fullPage is already a ProcessedPage (from fallback logic)
        currentPage = fullPage as ProcessedPage;
        console.log('[DEBUG] Using fullPage as ProcessedPage:', { 
          hasSections: currentPage.sections?.length || 0 
        });
      } else {
        // fullPage is the fetched page data object
        const toc = (fullPage.sections || []).map((section: any) => ({
          id: section.id,
          label: section.title,
          level: 1,
        }));
        currentPage = {
          ...currentPage,
          title: fullPage.title,
          pageNumber: fullPage.pageNumber,
          sections: fullPage.sections,
          toc,
        } satisfies ProcessedPage;
        console.log('[DEBUG] Updated currentPage with fetched sections:', { 
          sectionsCount: currentPage.sections?.length || 0 
        });
      }
      
      // Only check edit permissions if not a published doc
      if (!isPublishedRoute) {
        // Check if user can edit (owner or editor, not viewer)
        // Get the document ID from the page
        const pageData = await prisma.page.findUnique({
          where: { id: currentPage.id },
          select: {
            documentId: true,
            document: {
              select: {
                id: true,
                userId: true,
                projectId: true,
              },
            },
          },
        });
        
        if (pageData && pageData.document) {
          const doc = pageData.document;
          const isDocOwner = doc.userId === user.id;
          isOwner = isDocOwner; // Set isOwner flag
          
          if (isDocOwner) {
            canEdit = true;
          } else {
            // Check if user has been directly shared with the document as editor
            const directShare = await prisma.share.findFirst({
              where: {
                documentId: doc.id,
                sharedWith: user.id,
                status: 'accepted',
                role: 'editor',
              },
            });
            
            if (directShare) {
              canEdit = true;
            } else if (doc.projectId) {
              // Check project access
              const project = await prisma.project.findUnique({
                where: { id: doc.projectId },
                select: { userId: true },
              });
              
              if (project) {
                const isProjectOwner = project.userId === user.id;
                if (isProjectOwner) {
                  canEdit = true;
                } else {
                  // Check if user has been shared with the project as editor
                  const projectShare = await prisma.share.findFirst({
                    where: {
                      projectId: doc.projectId,
                      sharedWith: user.id,
                      status: 'accepted',
                      role: 'editor',
                    },
                  });
                  
                  canEdit = projectShare ? true : false;
                }
              }
            } else {
              canEdit = false;
            }
          }
        }
      }
    }
  }

  // Final debug check before rendering
  if (isPublishedRoute) {
    console.log('[DEBUG] Before render:', {
      currentPath,
      hasCurrentPage: !!currentPage,
      isPage: currentPage ? isPage(currentPage) : false,
      sectionsCount: currentPage && isPage(currentPage) ? (currentPage.sections?.length || 0) : 0,
      currentPageId: currentPage && isPage(currentPage) ? currentPage.id : null,
    });
  }

  return (
    <DocsPageContent
      currentPath={currentPath}
      currentPage={currentPage as ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null}
      processedProjects={processedProjects}
      processedYourDocs={processedYourDocs}
      processedPublishedDocs={processedPublishedDocs}
      canEdit={canEdit}
      isOwner={isOwner}
    />
  );
}
