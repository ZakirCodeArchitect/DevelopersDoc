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
} from '@/lib/docs';
import type { NavLink } from '@/components/docs/DocNavigation';
import { getDocsNavBundleForUser, getPageWithSectionsCached } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';
import { DocsPageContent } from '@/components/docs/DocsPageContent';
import { DocsLandingPage } from '@/components/docs/DocsLandingPage';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/db';

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

export interface DocsPageInnerProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function DocsPageInner({ params }: DocsPageInnerProps) {
  const [user, resolvedParams] = await Promise.all([getCurrentUser(), params]);
  if (!user) {
    redirect('/sign-in');
  }
  const slug = resolvedParams.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  const isPublishedRoute = currentPath.startsWith('/docs/published/');

  const { data, publishedDocsData } = await getDocsNavBundleForUser(user.id);

  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);
  const publishSlugsMap = new Map(Object.entries(publishedDocsData.publishSlugs));
  const processedPublishedDocs = processPublishedDocs(
    publishedDocsData.documents,
    publishSlugsMap
  );

  let currentPage = findDocumentByPath(currentPath, processedProjects, processedYourDocs, processedPublishedDocs);

  if (process.env.NODE_ENV === 'development' && isPublishedRoute) {
    console.log('[DEBUG] Published route:', {
      currentPath,
      foundPage: !!currentPage,
      isPage: currentPage ? isPage(currentPage) : false,
      hasSections: currentPage && isPage(currentPage) ? (currentPage.sections?.length || 0) : 0,
    });
  }

  if (currentPath === '/docs/published') {
    const { PublishedDocsList } = await import('@/components/docs/PublishedDocsList');
    return <PublishedDocsList />;
  }

  const needsFallbackFetch = !currentPage || (currentPage && isPage(currentPage) && (!currentPage.sections || currentPage.sections.length === 0));

  if (needsFallbackFetch && isPublishedRoute) {
    const publishedPath = currentPath.replace('/docs/published/', '');
    const pathParts = publishedPath.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      redirect('/docs');
    }

    const pageId = pathParts[pathParts.length - 1];

    if (!pageId || pageId.length < 10) {
      redirect('/docs');
    }

    let pageData;
    try {
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

      const [pubDoc, fullPageData] = await Promise.all([
        (async () => {
          try {
            return await (prisma as any).publishedDocument?.findUnique({
              where: { documentId: pageWithDoc.documentId },
              select: { id: true },
            });
          } catch {
            return null;
          }
        })(),
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

    const doc = pageData.document;
    const allPages = doc.pages || [];
    const currentPageIndex = allPages.findIndex((p: any) => p.id === pageId);

    const toc = pageData.sections.map((s: any) => ({
      id: s.id,
      label: s.title,
      level: 1,
    }));

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

  if (!currentPage && currentPath === '/docs') {
    return (
      <DocsLandingPage
        processedProjects={processedProjects}
        processedYourDocs={processedYourDocs}
      />
    );
  }

  if (!currentPage) {
    redirect('/docs');
  }

  if (currentPage && !isPage(currentPage) && 'pages' in currentPage) {
    const doc = currentPage as ProcessedDocument | ProcessedYourDoc;
    if (doc.pages.length > 0) {
      redirect(doc.pages[0].href);
    }
  }

  let canEdit = true;
  let isOwner = false;

  if (isPublishedRoute) {
    canEdit = false;
    isOwner = false;
  }

  if (currentPage && isPage(currentPage)) {
    const isPublishedPageWithEmptySections = isPublishedRoute && (!currentPage.sections || currentPage.sections.length === 0);

    const shouldFetchSections = (isPublishedRoute && isPublishedPageWithEmptySections) || !isPublishedRoute;

    let fullPage: any;
    if (shouldFetchSections) {
      if (isPublishedRoute) {
        const getPublishedPageCached = cache(async (pid: string) => {
          try {
            const pageWithDoc = await prisma.page.findUnique({
              where: { id: pid },
              select: {
                id: true,
                documentId: true,
              },
            });

            if (!pageWithDoc) {
              return null;
            }

            const [pubDoc, page] = await Promise.all([
              (async () => {
                try {
                  return await (prisma as any).publishedDocument?.findUnique({
                    where: { documentId: pageWithDoc.documentId },
                    select: { id: true },
                  });
                } catch {
                  return null;
                }
              })(),
              prisma.page.findUnique({
                where: { id: pid },
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
        fullPage = await getPageWithSectionsCached(currentPage.id, user.id);
      }
    } else {
      fullPage = currentPage as ProcessedPage;
    }

    if (!fullPage) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DEBUG] fullPage is null, redirecting:', {
          currentPageId: currentPage?.id,
          isPublishedRoute,
          shouldFetchSections,
        });
      }
      redirect('/docs');
    }

    if (fullPage) {
      if (isPage(fullPage) && 'href' in fullPage && 'toc' in fullPage) {
        currentPage = fullPage as ProcessedPage;
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Using fullPage as ProcessedPage:', { hasSections: currentPage.sections?.length || 0 });
        }
      } else {
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
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Updated currentPage with fetched sections:', { sectionsCount: currentPage.sections?.length || 0 });
        }
      }

      if (!isPublishedRoute) {
        const ownership = data.ownership;
        let docId: string | null = null;
        let projectId: string | null = null;

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

        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] Permission check:', { hasDocId: !!docId, hasOwnership: !!ownership, hasCurrentPage: !!currentPage, pageId: currentPage?.id });
        }

        if (docId && ownership) {
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

          const isDocOwned = ownedDocIds.has(docId);
          const isProjectOwned = projectId ? ownedProjectIds.has(projectId) : false;
          const isProjectDocOwned = ownedProjectDocumentIds.has(docId);

          if (process.env.NODE_ENV === 'development') {
            console.log('[DEBUG] Ownership check:', { isDocOwned, isProjectOwned, isProjectDocOwned, docId, projectId });
          }
          if (isDocOwned || isProjectOwned || isProjectDocOwned) {
            canEdit = true;
            isOwner = isDocOwned || (projectId ? ownedProjectIds.has(projectId) : false);
          } else {
            if (currentPage) {
              const [pageData, directShare, projectShare] = await Promise.all([
                getPageWithDocument(currentPage.id),
                getDirectShare(docId, user.id),
                projectId ? getProjectShare(projectId, user.id) : null,
              ]);

              if (pageData?.document) {
                isOwner = pageData.document.userId === user.id;
                canEdit = isOwner || !!(directShare || projectShare);
              } else {
                canEdit = !!(directShare || projectShare);
              }
            }
          }
        } else if (currentPage) {
          const pageData = await getPageWithDocument(currentPage.id);

          if (pageData?.document) {
            const doc = pageData.document;
            isOwner = doc.userId === user.id;

            if (isOwner) {
              canEdit = true;
            } else if (ownership) {
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

  if (process.env.NODE_ENV === 'development') {
    if (isPublishedRoute) {
      console.log('[DEBUG] Before render:', {
        currentPath,
        hasCurrentPage: !!currentPage,
        isPage: currentPage ? isPage(currentPage) : false,
        sectionsCount: currentPage && isPage(currentPage) ? (currentPage.sections?.length || 0) : 0,
        currentPageId: currentPage && isPage(currentPage) ? currentPage.id : null,
      });
    }
    console.log('[DEBUG] Final render props:', { canEdit, isOwner, isPublishedRoute, hasCurrentPage: !!currentPage });
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
