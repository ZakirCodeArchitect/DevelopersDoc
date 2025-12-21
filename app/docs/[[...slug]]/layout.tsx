import docsData from '@/data/docs.json';
import {
  processProjects,
  processYourDocs,
  buildSidebarItems,
  type DocsData,
} from '@/lib/docs';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
import type { NavItem } from '@/components/docs';

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Process the raw data to add hrefs, navigation, and TOC
  const data = docsData as DocsData;
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);

  // Build sidebar navigation
  const sidebarItems: NavItem[] = buildSidebarItems(processedProjects, processedYourDocs);

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

