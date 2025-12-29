import {
  processProjects,
  processYourDocs,
  findDocumentByPath,
  isPage,
  type ProcessedDocument,
  type ProcessedProject,
  type ProcessedYourDoc,
  type ProcessedPage,
} from '@/lib/docs';
import { getAllDocsNavData, getPageWithSections } from '@/lib/db';
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

  // NAV-ONLY dataset (no sections) for fast navigation and small payloads
  const data = await getAllDocsNavData(user.id);
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  // Find the current page
  let currentPage = findDocumentByPath(currentPath, processedProjects, processedYourDocs);

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
  
  if (currentPage && isPage(currentPage)) {
    const fullPage = await getPageWithSections(currentPage.id, user.id);
    // If page sections cannot be fetched (page doesn't exist or no access), redirect to /docs
    if (!fullPage) {
      redirect('/docs');
    }
    if (fullPage) {
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

  return (
    <DocsPageContent
      currentPath={currentPath}
      currentPage={currentPage as ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null}
      processedProjects={processedProjects}
      processedYourDocs={processedYourDocs}
      canEdit={canEdit}
    />
  );
}
