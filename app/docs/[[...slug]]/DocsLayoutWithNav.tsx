import {
  processProjects,
  processYourDocs,
  processPublishedDocs,
  buildSidebarItems,
  type ProcessedYourDoc,
} from '@/lib/docs';
import { getDocsNavBundleForUser } from '@/lib/db';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
import { FontLoader } from '@/components/FontLoader';

export async function DocsLayoutWithNav({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const { data, publishedDocsData } = await getDocsNavBundleForUser(userId);
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
    <>
      <FontLoader />
      <DocsLayoutClient
        sidebarItems={sidebarItems}
        processedProjects={processedProjects}
        processedYourDocs={processedYourDocs}
      >
        {children}
      </DocsLayoutClient>
    </>
  );
}
