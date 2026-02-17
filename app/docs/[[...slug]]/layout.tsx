import {
  processProjects,
  processYourDocs,
  processPublishedDocs,
  buildSidebarItems,
  type ProcessedYourDoc,
} from '@/lib/docs';
import { getAllDocsNavDataCached, getAllPublishedDocsNavCached } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
import { redirect } from 'next/navigation';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current user (cached per-request so layout + page share one call)
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Use CACHED nav data so we don't run 4–6 DB queries on every navigation
  const data = await getAllDocsNavDataCached(user.id);
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  let processedPublishedDocs: ProcessedYourDoc[] = [];
  try {
    const publishedDocsData = await getAllPublishedDocsNavCached();
    const publishSlugsMap = new Map(Object.entries(publishedDocsData.publishSlugs));
    processedPublishedDocs = processPublishedDocs(
      publishedDocsData.documents,
      publishSlugsMap
    );
  } catch (error) {
    // If published docs can't be fetched (e.g., schema not migrated), just continue without them
    console.error('Error fetching published docs:', error);
    processedPublishedDocs = [];
  }
  
  const sidebarItems = buildSidebarItems(
    processedProjects,
    processedYourDocs,
    processedPublishedDocs,
    data.ownership
  );

  return (
    <DocsLayoutClient
      sidebarItems={sidebarItems}
      processedProjects={processedProjects}
      processedYourDocs={processedYourDocs}
    >
      {children}
    </DocsLayoutClient>
  );
}

