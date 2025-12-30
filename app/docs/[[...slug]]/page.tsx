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
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

// CRITICAL: Define cached functions OUTSIDE the component to avoid recreating them on every render
// This ensures the cache actually works across requests
const getAllDocsNavDataCached = unstable_cache(
  async (userId: string) => getAllDocsNavData(userId),
  ['nav-data'],
  { 
    revalidate: 30, // Cache for 30 seconds - navigation data doesn't change often
    tags: ['nav-data']
  }
);

const getAllPublishedDocsNavCached = unstable_cache(
  async () => getAllPublishedDocsNav(),
  ['published-nav-data'],
  { 
    revalidate: 30, // Cache for 30 seconds
    tags: ['published-nav-data']
  }
);

// Cache individual page/document queries to avoid duplicate queries
const getPageWithDocument = cache(async (pageId: string) => {
  return prisma.page.findUnique({
    where: { id: pageId },
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
});

const getDirectShare = cache(async (documentId: string, userId: string) => {
  return prisma.share.findFirst({
    where: {
      documentId,
      sharedWith: userId,
      status: 'accepted',
      role: 'editor',
    },
    select: { role: true },
  });
});

const getProjectShare = cache(async (projectId: string, userId: string) => {
  return prisma.share.findFirst({
    where: {
      projectId,
      sharedWith: userId,
      status: 'accepted',
      role: 'editor',
    },
    select: { role: true },
  });
});

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
  // CRITICAL OPTIMIZATION: Fetch all navigation data in parallel
  // Cache functions are defined at module level to ensure proper caching
  
  // Fetch both in parallel instead of sequentially
  let data;
  let publishedDocsData: { documents: YourDocData[]; publishSlugs: Map<string, string> } = {
    documents: [],
    publishSlugs: new Map(),
  };
  
  // PERFORMANCE MONITORING: Track timing for each operation
  const perfStart = performance.now();
  
  try {
    const [navDataResult, publishedResult] = await Promise.all([
      (async () => {
        const start = performance.now();
        try {
          const result = await getAllDocsNavDataCached(user.id);
          console.log(`[PERF] getAllDocsNavData: ${(performance.now() - start).toFixed(2)}ms`);
          return result;
        } catch (error) {
          console.warn(`[PERF] getAllDocsNavData failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
          throw error;
        }
      })().catch((error) => {
        // If getAllDocsNavData fails (e.g., Share model not available), use minimal data
        console.warn('Error fetching all docs nav data, using minimal data:', error);
        return Promise.all([
          (import('@/lib/db')).then(m => m.getAllProjectsNav(user.id)),
          (import('@/lib/db')).then(m => m.getAllYourDocsNav(user.id)),
        ]).then(([ownedProjects, ownedYourDocs]) => ({
          projects: ownedProjects,
          yourDocs: ownedYourDocs,
          ownership: {
            ownedProjectIds: new Set(ownedProjects.map(p => p.id)),
            ownedDocIds: new Set(ownedYourDocs.map(d => d.id)),
            ownedProjectDocumentIds: new Set(ownedProjects.flatMap(p => p.documents.map(d => d.id))),
          },
        }));
      }),
      (async () => {
        const start = performance.now();
        try {
          const result = await getAllPublishedDocsNavCached();
          console.log(`[PERF] getAllPublishedDocsNav: ${(performance.now() - start).toFixed(2)}ms`);
          return result;
        } catch (error) {
          console.error(`[PERF] getAllPublishedDocsNav failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
          return { documents: [], publishSlugs: new Map() };
        }
      })(),
    ]);
    
    data = navDataResult;
    publishedDocsData = publishedResult;
    console.log(`[PERF] Total nav data fetch: ${(performance.now() - perfStart).toFixed(2)}ms`);
  } catch (error) {
    console.error('Critical error fetching navigation data:', error);
    // Fallback to minimal data
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
  const processedPublishedDocs = processPublishedDocs(
    publishedDocsData.documents,
    publishedDocsData.publishSlugs
  );

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
    // Optimize: Fetch page data and check published status in parallel
    let pageData;
    try {
      // First, get the page with minimal document info to check published status
      const pageWithDoc = await prisma.page.findUnique({
        where: { id: pageId },
        select: {
          id: true,
          title: true,
          pageNumber: true,
          documentId: true,
          document: {
            select: {
              id: true,
            },
          },
        },
      });
      
      if (!pageWithDoc || !pageWithDoc.document) {
        redirect('/docs');
      }
      
      // Check if document is published in parallel with fetching full page data
      const [pubDoc, fullPageData] = await Promise.all([
        // Check published status
        (async () => {
          try {
            return await (prisma as any).publishedDocument?.findUnique({
              where: { documentId: pageWithDoc.documentId },
              select: { id: true }, // Only need to know if it exists
            });
          } catch {
            return null;
          }
        })(),
        // Fetch full page data with sections and pages for navigation
        prisma.page.findUnique({
          where: { id: pageId },
          select: {
            id: true,
            title: true,
            pageNumber: true,
            sections: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                content: true,
                componentType: true,
              },
            },
            document: {
              select: {
                id: true,
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
        }),
      ]);
      
      if (!pubDoc || !fullPageData || !fullPageData.document) {
        redirect('/docs');
      }
      
      pageData = fullPageData;
    } catch (error) {
      console.error('Error fetching page by ID:', error);
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
        // Cache the published page fetch
        // Optimize: Use select to fetch only needed fields and combine queries
        const getPublishedPageCached = cache(async (pageId: string) => {
          try {
            // First get documentId to check published status
            const pageWithDoc = await prisma.page.findUnique({
              where: { id: pageId },
              select: {
                id: true,
                documentId: true,
              },
            });
            
            if (!pageWithDoc) {
              return null;
            }
            
            // Fetch page data and check published status in parallel
            const [pubDoc, page] = await Promise.all([
              // Check published status
              (async () => {
                try {
                  return await (prisma as any).publishedDocument?.findUnique({
                    where: { documentId: pageWithDoc.documentId },
                    select: { id: true }, // Only need to know if it exists
                  });
                } catch {
                  return null;
                }
              })(),
              // Fetch full page with sections (only fields we need)
              prisma.page.findUnique({
                where: { id: pageId },
                select: {
                  id: true,
                  title: true,
                  pageNumber: true,
                  sections: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                      id: true,
                      title: true,
                      type: true,
                      content: true,
                      componentType: true,
                    },
                  },
                },
              }),
            ]);
            
            if (!pubDoc || !page) {
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
        });
        
        fullPage = await getPublishedPageCached(currentPage.id);
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
        // CRITICAL OPTIMIZATION: Try to determine ownership from nav data FIRST
        // This avoids an extra database query in most cases
        const ownership = data.ownership;
        let docId: string | null = null;
        let projectId: string | null = null;
        
        // Try to find documentId from processed data first
        // Check if currentPage belongs to a document we know about
        if (currentPage) {
          const pageId = currentPage.id;
          for (const project of processedProjects) {
            for (const doc of project.documents) {
              if (doc.pages.some(p => p.id === pageId)) {
                docId = doc.id;
                projectId = project.id;
                break;
              }
            }
            if (docId) break;
          }
          
          if (!docId) {
            for (const doc of processedYourDocs) {
              if (doc.pages.some(p => p.id === pageId)) {
                docId = doc.id;
                break;
              }
            }
          }
        }
        
        // Debug: Log what we found
        console.log('[DEBUG] Permission check:', { 
          hasDocId: !!docId, 
          hasOwnership: !!ownership, 
          hasCurrentPage: !!currentPage,
          pageId: currentPage?.id 
        });
        
        // If we found the doc in nav data, check ownership immediately (no DB query needed)
        // Note: unstable_cache serializes Sets to arrays, so we need to convert back
        if (docId && ownership) {
          // Helper to safely convert to Set (handles Set, Array, or other types)
          const toSet = (value: any): Set<string> => {
            if (value instanceof Set) return value;
            if (Array.isArray(value)) return new Set(value);
            // If it's an object (from serialization), try to extract values
            if (value && typeof value === 'object') {
              try {
                return new Set(Object.values(value) as string[]);
              } catch {
                return new Set();
              }
            }
            return new Set();
          };
          
          const ownedDocIds = toSet(ownership.ownedDocIds);
          const ownedProjectIds = toSet(ownership.ownedProjectIds);
          const ownedProjectDocumentIds = toSet(ownership.ownedProjectDocumentIds);
          
          const isDocOwned = ownedDocIds.has(docId);
          const isProjectOwned = projectId ? ownedProjectIds.has(projectId) : false;
          const isProjectDocOwned = ownedProjectDocumentIds.has(docId);
          
          console.log('[DEBUG] Ownership check:', { 
            isDocOwned, 
            isProjectOwned, 
            isProjectDocOwned,
            docId,
            projectId
          });
          
          if (isDocOwned || isProjectOwned || isProjectDocOwned) {
            canEdit = true;
            isOwner = isDocOwned || (projectId ? ownedProjectIds.has(projectId) : false);
          } else {
            // Not found in nav ownership - need to check shares and verify ownership from DB
            // Use cached functions to avoid duplicate queries
            if (currentPage) {
              const [pageData, directShare, projectShare] = await Promise.all([
                getPageWithDocument(currentPage.id),
                getDirectShare(docId, user.id),
                projectId ? getProjectShare(projectId, user.id) : null,
              ]);
              
              if (pageData?.document) {
                isOwner = pageData.document.userId === user.id;
                // If user is the owner, they can always edit
                // Otherwise, check if they have editor share access
                canEdit = isOwner || !!(directShare || projectShare);
              } else {
                // Fallback: if we can't get document info, check shares only
                canEdit = !!(directShare || projectShare);
              }
            }
          }
        } else if (currentPage) {
          // Fallback: if we can't find doc in nav data, fetch it (cached)
          const pageData = await getPageWithDocument(currentPage.id);
          
          if (pageData?.document) {
            const doc = pageData.document;
            isOwner = doc.userId === user.id;
            
            if (isOwner) {
              canEdit = true;
            } else if (ownership) {
              // Handle Sets that may have been serialized to arrays/objects by unstable_cache
              const toSet = (value: any): Set<string> => {
                if (value instanceof Set) return value;
                if (Array.isArray(value)) return new Set(value);
                if (value && typeof value === 'object') {
                  try {
                    return new Set(Object.values(value) as string[]);
                  } catch {
                    return new Set();
                  }
                }
                return new Set();
              };
              
              const ownedDocIds = toSet(ownership.ownedDocIds);
              const ownedProjectIds = toSet(ownership.ownedProjectIds);
              const ownedProjectDocumentIds = toSet(ownership.ownedProjectDocumentIds);
              
              const isDocOwned = ownedDocIds.has(doc.id);
              const isProjectOwned = doc.projectId ? ownedProjectIds.has(doc.projectId) : false;
              const isProjectDocOwned = ownedProjectDocumentIds.has(doc.id);
              
              if (isDocOwned || isProjectOwned || isProjectDocOwned) {
                canEdit = true;
              } else {
                // Check shares (cached)
                const [directShare, projectShare] = await Promise.all([
                  getDirectShare(doc.id, user.id),
                  doc.projectId ? getProjectShare(doc.projectId, user.id) : null,
                ]);
                
                canEdit = !!(directShare || projectShare);
              }
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

  // Debug: Log final values before rendering
  console.log('[DEBUG] Final render props:', { 
    canEdit, 
    isOwner, 
    isPublishedRoute,
    hasCurrentPage: !!currentPage 
  });

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
