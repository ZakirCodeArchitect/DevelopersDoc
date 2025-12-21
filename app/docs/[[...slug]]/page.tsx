import {
  processProjects,
  processYourDocs,
  findDocumentByPath,
  migrateSectionsToPages,
  isPage,
  type ProcessedDocument,
  type ProcessedProject,
  type ProcessedYourDoc,
  type ProcessedPage,
  type DocsData,
} from '@/lib/docs';
import docsDataRaw from '@/data/docs.json';
import { DocsPageContent } from '@/components/docs/DocsPageContent';
import { redirect } from 'next/navigation';

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const currentPath = slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';

  // Migrate old data structure if needed, then process the raw data
  const migratedData = migrateSectionsToPages({ ...docsDataRaw });
  const data = migratedData as DocsData;
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  // Find the current page
  let currentPage = findDocumentByPath(currentPath, processedProjects, processedYourDocs);

  // If navigating to /docs and no page found, redirect to first project
  if (!currentPage && currentPath === '/docs' && processedProjects.length > 0) {
    redirect(processedProjects[0].href);
  }

  // If accessing a document directly (not a page), redirect to first page
  if (currentPage && !isPage(currentPage) && 'pages' in currentPage) {
    const doc = currentPage as ProcessedDocument | ProcessedYourDoc;
    if (doc.pages.length > 0) {
      redirect(doc.pages[0].href);
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
