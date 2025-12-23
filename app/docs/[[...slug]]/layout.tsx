import docsData from '@/data/docs.json';
import {
  processProjects,
  processYourDocs,
  buildSidebarItems,
  type DocsData,
} from '@/lib/docs';
import { DocsLayoutClient } from '@/components/docs/DocsLayoutClient';
import type { NavItem } from '@/components/docs';
import { cache } from 'react';

// Cache the processed data to prevent recreating objects on every navigation
// This ensures the same object references are used across navigations
const getProcessedDocsData = cache(() => {
  const data = docsData as DocsData;
  const processedProjects = processProjects(data.projects);
  const processedYourDocs = processYourDocs(data.yourDocs);
  const sidebarItems = buildSidebarItems(processedProjects, processedYourDocs);
  
  return {
    processedProjects,
    processedYourDocs,
    sidebarItems,
  };
});

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use cached data to maintain same object references across navigations
  const { processedProjects, processedYourDocs, sidebarItems } = getProcessedDocsData();

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

