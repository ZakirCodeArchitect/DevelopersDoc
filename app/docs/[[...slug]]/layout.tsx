import {
  processProjects,
  processYourDocs,
  processPublishedDocs,
  buildSidebarItems,
  type ProcessedYourDoc,
} from '@/lib/docs';
import { getAllDocsNavData, getAllPublishedDocsNav } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
import { redirect } from 'next/navigation';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Get data for the current user
  const data = await getAllDocsNavData(user.id);
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);
  
  // Get published documents
  let processedPublishedDocs: ProcessedYourDoc[] = [];
  try {
    const publishedDocsData = await getAllPublishedDocsNav();
    processedPublishedDocs = processPublishedDocs(
      publishedDocsData.documents,
      publishedDocsData.publishSlugs
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

