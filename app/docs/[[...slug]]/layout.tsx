import {
  processProjects,
  processYourDocs,
  processPublishedDocs,
  buildSidebarItems,
  type ProcessedYourDoc,
} from '@/lib/docs';
import { getDocsNavBundleForUser } from '@/lib/db';
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

  // Same bundle as page.tsx — React cache() dedupes so we only hit DB/cache once per request
  const { data, publishedDocsData } = await getDocsNavBundleForUser(user.id);
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  let processedPublishedDocs: ProcessedYourDoc[] = [];
  try {
    const publishSlugsMap = new Map(Object.entries(publishedDocsData.publishSlugs));
    processedPublishedDocs = processPublishedDocs(
      publishedDocsData.documents,
      publishSlugsMap
    );
  } catch (error) {
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

