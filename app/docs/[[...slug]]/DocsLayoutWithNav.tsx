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
import { FontLoader } from '@/components/FontLoader';
import { redirect } from 'next/navigation';

export async function DocsLayoutWithNav({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    // Session check already happened in layout.tsx; this fallback protects against DB sync misses.
    redirect('/');
  }

  const userId = user.id;
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
