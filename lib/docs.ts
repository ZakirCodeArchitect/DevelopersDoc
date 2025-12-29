import type { NavItem, TocItem, NavLink } from '@/components/docs';

// Raw data types (what should be in docs.json)
export interface DocumentSection {
  id: string;
  title: string;
  type: 'text' | 'html' | 'component';
  content?: string[];
  componentType?: string;
}

export interface DocumentPage {
  id: string;
  title: string;
  pageNumber?: number;
  sections: DocumentSection[];
}

export interface CodeBlockData {
  filename: string;
  language: string;
  code: string;
  highlightedLines?: number[];
}

export interface DocumentData {
  id: string;
  label: string;
  title: string;
  description?: string;
  lastUpdated: string;
  content: {
    pages: DocumentPage[];
    codeBlocks?: CodeBlockData[];
  };
}

export interface ProjectData {
  id: string;
  label: string;
  title: string;
  description?: string;
  lastUpdated: string;
  documents: DocumentData[];
}

export interface YourDocData {
  id: string;
  label: string;
  title: string;
  description?: string;
  lastUpdated: string;
  content: {
    pages: DocumentPage[];
    codeBlocks?: CodeBlockData[];
  };
}

export interface DocsData {
  projects: ProjectData[];
  yourDocs: YourDocData[];
  ownership?: {
    ownedProjectIds: Set<string>;
    ownedDocIds: Set<string>;
    ownedProjectDocumentIds: Set<string>;
  };
}

// Processed types (with generated hrefs and navigation)
export interface ProcessedPage extends DocumentPage {
  href: string;
  toc: TocItem[];
  navigation: {
    previous: NavLink | null;
    next: NavLink | null;
  };
}

export interface ProcessedDocument extends Omit<DocumentData, 'content'> {
  href: string;
  pages: ProcessedPage[];
}

export interface ProcessedProject extends Omit<ProjectData, 'documents'> {
  href: string;
  documents: ProcessedDocument[];
  navigation: {
    previous: NavLink | null;
    next: NavLink | null;
  };
}

export interface ProcessedYourDoc extends Omit<YourDocData, 'content'> {
  href: string;
  pages: ProcessedPage[];
}

/**
 * Generate href for a project
 */
function generateProjectHref(projectId: string): string {
  return `/docs/projects/${projectId}`;
}

/**
 * Generate href for a project document
 */
function generateProjectDocumentHref(projectId: string, documentId: string, pageId?: string): string {
  if (pageId) {
    return `/docs/projects/${projectId}/${documentId}/${pageId}`;
  }
  return `/docs/projects/${projectId}/${documentId}`;
}

/**
 * Generate href for a "Your Docs" document
 */
function generateYourDocHref(docId: string, pageId?: string): string {
  if (pageId) {
    return `/docs/${docId}/${pageId}`;
  }
  return `/docs/${docId}`;
}

/**
 * Generate TOC items from document sections
 */
function generateTocFromSections(sections: DocumentSection[]): TocItem[] {
  const tocItems: TocItem[] = [];
  
  sections.forEach((section) => {
    // If section has a title, it's an H2 section heading
    if (section.title && section.title.trim()) {
      // Generate ID from title
      const id = section.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      tocItems.push({
        id: id || section.id,
        label: section.title,
        level: 1, // H2 = level 1 in TOC
      });
    }
    
    // Extract H3 and H4 headings from section content
    if (section.content && Array.isArray(section.content)) {
      section.content.forEach((html: string) => {
        if (typeof html === 'string') {
          // Match H3 tags - ID is optional, generate one if missing
          const h3Matches = html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi);
          const h3MatchesWithId = html.matchAll(/<h3[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h3>/gi);
          
          // Use a Set to track which headings we've already added
          const addedH3Ids = new Set<string>();
          
          // First, add headings with IDs
          for (const match of h3MatchesWithId) {
            const id = match[1];
            const label = match[2].replace(/<[^>]+>/g, '').trim(); // Strip HTML tags
            if (label && !addedH3Ids.has(id)) {
              tocItems.push({
                id,
                label,
                level: 2, // H3 = level 2 in TOC
              });
              addedH3Ids.add(id);
            }
          }
          
          // Then, add headings without IDs (generate IDs from text)
          for (const match of h3Matches) {
            const fullMatch = match[0];
            // Check if this heading already has an ID
            const idMatch = fullMatch.match(/id=["']([^"']+)["']/i);
            if (idMatch) continue; // Already added above
            
            const label = match[1].replace(/<[^>]+>/g, '').trim(); // Strip HTML tags
            if (label) {
              const id = label
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `h3-${tocItems.length}`;
              
              if (!addedH3Ids.has(id)) {
                tocItems.push({
                  id,
                  label,
                  level: 2, // H3 = level 2 in TOC
                });
                addedH3Ids.add(id);
              }
            }
          }
          
          // Match H4 tags - ID is optional, generate one if missing
          const h4Matches = html.matchAll(/<h4[^>]*>(.*?)<\/h4>/gi);
          const h4MatchesWithId = html.matchAll(/<h4[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h4>/gi);
          const addedH4Ids = new Set<string>();
          
          // First, add headings with IDs
          for (const match of h4MatchesWithId) {
            const id = match[1];
            const label = match[2].replace(/<[^>]+>/g, '').trim(); // Strip HTML tags
            if (label && !addedH4Ids.has(id)) {
              tocItems.push({
                id,
                label,
                level: 3, // H4 = level 3 in TOC
              });
              addedH4Ids.add(id);
            }
          }
          
          // Then, add headings without IDs (generate IDs from text)
          for (const match of h4Matches) {
            const fullMatch = match[0];
            // Check if this heading already has an ID
            const idMatch = fullMatch.match(/id=["']([^"']+)["']/i);
            if (idMatch) continue; // Already added above
            
            const label = match[1].replace(/<[^>]+>/g, '').trim(); // Strip HTML tags
            if (label) {
              const id = label
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `h4-${tocItems.length}`;
              
              if (!addedH4Ids.has(id)) {
                tocItems.push({
                  id,
                  label,
                  level: 3, // H4 = level 3 in TOC
                });
                addedH4Ids.add(id);
              }
            }
          }
        }
      });
    }
  });
  
  return tocItems;
}

/**
 * Migrate old sections structure to pages structure (for backward compatibility)
 */
export function migrateSectionsToPages(data: any): any {
  if (data.projects) {
    data.projects = data.projects.map((project: any) => ({
      ...project,
      documents: project.documents?.map((doc: any) => {
        if (doc.content?.sections && !doc.content?.pages) {
          // Convert sections to pages
          const pages = doc.content.sections.map((section: any) => ({
            id: section.id,
            title: section.title,
            sections: [{
              id: `${section.id}-section`,
              title: section.title,
              type: section.type || 'text',
              content: section.content || [],
              componentType: section.componentType,
            }],
          }));
          return {
            ...doc,
            content: {
              ...doc.content,
              pages,
            },
          };
        }
        return doc;
      }) || [],
    }));
  }

  if (data.yourDocs) {
    data.yourDocs = data.yourDocs.map((doc: any) => {
      if (doc.content?.sections && !doc.content?.pages) {
        // Convert sections to pages
        const pages = doc.content.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          sections: [{
            id: `${section.id}-section`,
            title: section.title,
            type: section.type || 'text',
            content: section.content || [],
            componentType: section.componentType,
          }],
        }));
        return {
          ...doc,
          content: {
            ...doc.content,
            pages,
          },
        };
      }
      return doc;
    });
  }

  return data;
}

/**
 * Process projects: add hrefs, process documents, and generate navigation
 */
export function processProjects(projects: ProjectData[]): ProcessedProject[] {
  return projects.map((project, index) => {
    const processedDocuments: ProcessedDocument[] = project.documents.map((doc) => {
      const processedPages: ProcessedPage[] = (doc.content.pages || []).map((page, pageIndex) => {
        const pageHref = generateProjectDocumentHref(project.id, doc.id, page.id);
        const toc = generateTocFromSections(page.sections || []);

        // Generate page navigation (previous/next page within document)
        const previous: NavLink | null =
          pageIndex > 0
            ? {
                label: doc.content.pages[pageIndex - 1].title,
                href: generateProjectDocumentHref(project.id, doc.id, doc.content.pages[pageIndex - 1].id),
              }
            : null;

        const next: NavLink | null =
          pageIndex < (doc.content.pages.length - 1)
            ? {
                label: doc.content.pages[pageIndex + 1].title,
                href: generateProjectDocumentHref(project.id, doc.id, doc.content.pages[pageIndex + 1].id),
              }
            : null;

        return {
          ...page,
          href: pageHref,
          toc,
          navigation: {
            previous,
            next,
          },
        };
      });

      return {
        id: doc.id,
        label: doc.label,
        title: doc.title,
        description: doc.description,
        lastUpdated: doc.lastUpdated,
        href: generateProjectDocumentHref(project.id, doc.id),
        pages: processedPages,
      };
    });

    // Generate navigation (previous/next)
    const previous: NavLink | null =
      index > 0
        ? {
            label: projects[index - 1].label,
            href: generateProjectHref(projects[index - 1].id),
          }
        : null;

    const next: NavLink | null =
      index < projects.length - 1
        ? {
            label: projects[index + 1].label,
            href: generateProjectHref(projects[index + 1].id),
          }
        : null;

    return {
      ...project,
      href: generateProjectHref(project.id),
      documents: processedDocuments,
      navigation: {
        previous,
        next,
      },
    };
  });
}

/**
 * Generate href for a published document
 * Uses page ID directly, no slug needed
 */
function generatePublishedDocHref(pageId: string): string {
  return `/docs/published/${pageId}`;
}

/**
 * Process published documents: add hrefs and generate TOC
 * Similar to processYourDocs but uses publishSlug for URLs
 */
export function processPublishedDocs(publishedDocs: YourDocData[] | undefined, publishSlugs: Map<string, string>): ProcessedYourDoc[] {
  if (!publishedDocs || !Array.isArray(publishedDocs)) {
    return [];
  }
  return publishedDocs.map((doc) => {
    const processedPages: ProcessedPage[] = (doc.content.pages || []).map((page, pageIndex) => {
      // Use page ID directly for href - no slug needed
      const pageHref = generatePublishedDocHref(page.id);
      const toc = generateTocFromSections(page.sections || []);

      // Generate page navigation (previous/next page within document)
      const previous: NavLink | null =
        pageIndex > 0
          ? {
              label: doc.content.pages[pageIndex - 1].title,
              href: generatePublishedDocHref(doc.content.pages[pageIndex - 1].id),
            }
          : null;
      const next: NavLink | null =
        pageIndex < doc.content.pages.length - 1
          ? {
              label: doc.content.pages[pageIndex + 1].title,
              href: generatePublishedDocHref(doc.content.pages[pageIndex + 1].id),
            }
          : null;

      return {
        ...page,
        href: pageHref,
        toc,
        navigation: {
          previous,
          next,
        },
      };
    });

    // For document href, use first page ID
    const firstPageHref = processedPages.length > 0 ? processedPages[0].href : `/docs/published/${doc.id}`;

    return {
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description,
      lastUpdated: doc.lastUpdated,
      href: firstPageHref,
      pages: processedPages,
    };
  });
}

/**
 * Process "Your Docs": add hrefs and generate TOC
 */
export function processYourDocs(yourDocs: YourDocData[]): ProcessedYourDoc[] {
  return yourDocs.map((doc) => {
    const processedPages: ProcessedPage[] = (doc.content.pages || []).map((page, pageIndex) => {
      const pageHref = generateYourDocHref(doc.id, page.id);
      const toc = generateTocFromSections(page.sections || []);

      // Generate page navigation (previous/next page within document)
      const previous: NavLink | null =
        pageIndex > 0
          ? {
              label: doc.content.pages[pageIndex - 1].title,
              href: generateYourDocHref(doc.id, doc.content.pages[pageIndex - 1].id),
            }
          : null;

      const next: NavLink | null =
        pageIndex < (doc.content.pages.length - 1)
          ? {
              label: doc.content.pages[pageIndex + 1].title,
              href: generateYourDocHref(doc.id, doc.content.pages[pageIndex + 1].id),
            }
          : null;

      return {
        ...page,
        href: pageHref,
        toc,
        navigation: {
          previous,
          next,
        },
      };
    });

    return {
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description,
      lastUpdated: doc.lastUpdated,
      href: generateYourDocHref(doc.id),
      pages: processedPages,
    };
  });
}

/**
 * Build sidebar navigation items from processed data
 */
export function buildSidebarItems(
  projects: ProcessedProject[],
  yourDocs: ProcessedYourDoc[],
  publishedDocs?: ProcessedYourDoc[],
  ownership?: {
    ownedProjectIds: Set<string>;
    ownedDocIds: Set<string>;
    ownedProjectDocumentIds: Set<string>;
  }
): NavItem[] {
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/docs',
    },
  ];

  // Add Published Docs section above Projects (if any published docs exist)
  if (publishedDocs && publishedDocs.length > 0) {
    navItems.push({
      label: 'Published Docs',
      href: '#',
      children: publishedDocs.map((doc) => ({
        label: doc.label,
        href: doc.href,
        isOwner: false, // Published docs are always view-only
      })),
    });
  }

  // Add Projects section
  navItems.push({
    label: 'Projects',
    href: '#',
    children: projects.map((project) => {
      const isOwner = ownership?.ownedProjectIds.has(project.id) ?? false;
      
      return {
        label: project.label,
        href: project.href,
        isOwner,
        children: project.documents.map((doc) => {
          const isDocOwner = ownership?.ownedProjectDocumentIds.has(doc.id) ?? false;
          
          return {
            label: doc.label,
            href: doc.href,
            isOwner: isDocOwner,
          };
        }),
      };
    }),
  });

  // Add Your Docs section
  navItems.push({
    label: 'Your Docs',
    href: '#',
    children: yourDocs.map((doc) => {
      const isOwner = ownership?.ownedDocIds.has(doc.id) ?? false;
      
      return {
        label: doc.label,
        href: doc.href,
        isOwner,
      };
    }),
  });

  return navItems;
}

/**
 * Find a document or page by path from all processed data
 */
export function findDocumentByPath(
  path: string,
  projects: ProcessedProject[],
  yourDocs: ProcessedYourDoc[],
  publishedDocs?: ProcessedYourDoc[]
): ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null {
  // Check projects and their documents/pages
  for (const project of projects) {
    if (project.href === path) {
      return project;
    }
    for (const doc of project.documents) {
      if (doc.href === path) {
        // Return first page if document has pages, otherwise return doc
        return doc.pages.length > 0 ? doc.pages[0] : doc;
      }
      // Check pages within document
      for (const page of doc.pages) {
        if (page.href === path) {
          return page;
        }
      }
    }
  }

  // Check your docs and their pages
  for (const doc of yourDocs) {
    if (doc.href === path) {
      // Return first page if document has pages, otherwise return doc
      return doc.pages.length > 0 ? doc.pages[0] : doc;
    }
    // Check pages within document
    for (const page of doc.pages) {
      if (page.href === path) {
        return page;
      }
    }
  }

  // Check published docs and their pages
  if (publishedDocs) {
    for (const doc of publishedDocs) {
      if (doc.href === path) {
        // Return first page if document has pages, otherwise return doc
        return doc.pages.length > 0 ? doc.pages[0] : doc;
      }
      // Check pages within document
      for (const page of doc.pages) {
        if (page.href === path) {
          return page;
        }
      }
    }
  }

  return null;
}

/**
 * Get the document that contains a page
 */
export function getDocumentForPage(
  page: ProcessedPage,
  projects: ProcessedProject[],
  yourDocs: ProcessedYourDoc[],
  publishedDocs?: ProcessedYourDoc[]
): ProcessedDocument | ProcessedYourDoc | null {
  // Check projects
  for (const project of projects) {
    for (const doc of project.documents) {
      if (doc.pages.some(p => p.href === page.href || p.id === page.id)) {
        return doc;
      }
    }
  }

  // Check your docs
  for (const doc of yourDocs) {
    if (doc.pages.some(p => p.href === page.href || p.id === page.id)) {
      return doc;
    }
  }

  // Check published docs
  if (publishedDocs) {
    for (const doc of publishedDocs) {
      if (doc.pages.some(p => p.href === page.href || p.id === page.id)) {
        return doc;
      }
    }
  }

  return null;
}

/**
 * Check if a document is a project
 */
export function isProject(
  doc: ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null
): doc is ProcessedProject {
  return doc !== null && 'documents' in doc && 'navigation' in doc && !('sections' in doc);
}

/**
 * Check if a document is a project document
 */
export function isProjectDocument(
  doc: ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null,
  projects: ProcessedProject[]
): doc is ProcessedDocument {
  if (!doc || isProject(doc) || isPage(doc)) {
    return false;
  }
  return projects.some((project) =>
    project.documents.some((projectDoc) => projectDoc.href === doc.href)
  );
}

/**
 * Check if a document is a page
 */
export function isPage(
  doc: ProcessedDocument | ProcessedProject | ProcessedYourDoc | ProcessedPage | null
): doc is ProcessedPage {
  return doc !== null && 'navigation' in doc && 'toc' in doc && 'sections' in doc;
}

/**
 * Get navigation for a project document
 */
export function getProjectDocumentNavigation(
  doc: ProcessedDocument,
  projects: ProcessedProject[]
): { previous: NavLink | null; next: NavLink | null } {
  for (const project of projects) {
    const docIndex = project.documents.findIndex((d) => d.href === doc.href);
    if (docIndex !== -1) {
      const previous: NavLink | null =
        docIndex > 0
          ? {
              label: project.documents[docIndex - 1].label,
              href: project.documents[docIndex - 1].href,
            }
          : null;

      const next: NavLink | null =
        docIndex < project.documents.length - 1
          ? {
              label: project.documents[docIndex + 1].label,
              href: project.documents[docIndex + 1].href,
            }
          : null;

      return { previous, next };
    }
  }
  return { previous: null, next: null };
}

