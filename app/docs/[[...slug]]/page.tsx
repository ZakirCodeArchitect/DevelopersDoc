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
import { DocsPageContent } from '@/components/docs/DocsPageContent';
import { DocsLandingPage } from '@/components/docs/DocsLandingPage';
import { redirect } from 'next/navigation';
import { cache } from 'react';

// Cache the processed data to prevent recreating objects on every navigation
const getProcessedDocsData = cache(async () => {
  // NAV-ONLY dataset (no sections) for fast navigation and small payloads
  const data = await getAllDocsNavData();
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);
  
  return {
    processedProjects,
    processedYourDocs,
  };
});

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  // Use cached data to maintain same object references across navigations
  const { processedProjects, processedYourDocs } = await getProcessedDocsData();

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

  // If accessing a document directly (not a page), redirect to first page
  if (currentPage && !isPage(currentPage) && 'pages' in currentPage) {
    const doc = currentPage as ProcessedDocument | ProcessedYourDoc;
    if (doc.pages.length > 0) {
      redirect(doc.pages[0].href);
    }
  }

  // If this is a page, fetch its sections only (content) and patch into the processed page.
  // This avoids loading ALL sections for ALL docs on every navigation.
  if (currentPage && isPage(currentPage)) {
    const fullPage = await getPageWithSections(currentPage.id);
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
    }
  }

  return (
    <DocsPageContent
      currentPath={currentPath}
      currentPage={currentPage as ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null}
      processedProjects={processedProjects}
      processedYourDocs={processedYourDocs}
    />
  );
}
