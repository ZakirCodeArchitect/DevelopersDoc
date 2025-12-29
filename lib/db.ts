import { PrismaClient } from '@prisma/client';
import { cache } from 'react';
import type { 
  ProjectData, 
  DocumentData, 
  YourDocData, 
  DocumentPage, 
  DocumentSection,
  DocsData 
} from './docs';
import { getSharedProjects, getSharedDocuments } from './shares';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database utility functions

/**
 * Get all projects with their documents for a specific user
 */
export async function getAllProjects(userId: string): Promise<ProjectData[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      documents: {
        include: {
      pages: {
        include: {
          sections: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { pageNumber: 'asc' }
      }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return projects.map(project => ({
    id: project.id, // Return UUID
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map(doc => ({
      id: doc.id, // Return UUID
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id, // Return UUID
          title: page.title,
          pageNumber: page.pageNumber,
          sections: page.sections.map(section => ({
            id: section.id, // UUID as they're not in URLs
            title: section.title,
            type: section.type as 'text' | 'html' | 'component',
            content: section.content,
            componentType: section.componentType || undefined,
          })),
        })),
      },
    })),
  }));
}

/**
 * Get all "Your Docs" (documents without a project) for a specific user
 */
export async function getAllYourDocs(userId: string): Promise<YourDocData[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: null,
      userId,
    },
    include: {
      pages: {
        include: {
          sections: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { pageNumber: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return documents.map(doc => ({
    id: doc.id, // Return UUID
    label: doc.label,
    title: doc.title,
    description: doc.description || undefined,
    lastUpdated: doc.lastUpdated,
    content: {
      pages: doc.pages.map(page => ({
        id: page.id, // Return UUID
        title: page.title,
        sections: page.sections.map(section => ({
          id: section.id, // UUID
          title: section.title,
          type: section.type as 'text' | 'html' | 'component',
          content: section.content,
          componentType: section.componentType || undefined,
        })),
      })),
    },
  }));
}

/**
 * Get all docs data (projects + your docs) for a specific user, including shared items
 */
export async function getAllDocsData(userId: string): Promise<DocsData> {
  const [ownedProjects, ownedYourDocs, sharedProjects, sharedYourDocs] = await Promise.all([
    getAllProjects(userId),
    getAllYourDocs(userId),
    getSharedProjects(userId),
    getSharedDocuments(userId),
  ]);

  // Convert shared projects to ProjectData format
  const sharedProjectsData: ProjectData[] = sharedProjects.map(project => ({
    id: project.id,
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map(doc => ({
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id,
          title: page.title,
          pageNumber: page.pageNumber,
          sections: [], // nav-only
        })),
      },
    })),
  }));

  // Convert shared documents to YourDocData format
  const sharedYourDocsData: YourDocData[] = sharedYourDocs
    .filter(doc => !doc.projectId) // Only include documents without projects
    .map(doc => ({
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id,
          title: page.title,
          pageNumber: page.pageNumber,
          sections: [], // nav-only
        })),
      },
    }));

  // Merge owned and shared items (avoid duplicates)
  const allProjects = [...ownedProjects];
  const allYourDocs = [...ownedYourDocs];
  
  // Add shared projects that aren't already owned
  for (const sharedProject of sharedProjectsData) {
    if (!allProjects.find(p => p.id === sharedProject.id)) {
      allProjects.push(sharedProject);
    }
  }

  // Add shared docs that aren't already owned
  for (const sharedDoc of sharedYourDocsData) {
    if (!allYourDocs.find(d => d.id === sharedDoc.id)) {
      allYourDocs.push(sharedDoc);
    }
  }

  // Build ownership maps for efficient lookup
  const ownedProjectIds = new Set(ownedProjects.map(p => p.id));
  const ownedDocIds = new Set(ownedYourDocs.map(d => d.id));
  
  // For project documents, check if the project is owned
  const ownedProjectDocumentIds = new Set<string>();
  for (const project of ownedProjects) {
    for (const doc of project.documents) {
      ownedProjectDocumentIds.add(doc.id);
    }
  }

  return {
    projects: allProjects,
    yourDocs: allYourDocs,
    ownership: {
      ownedProjectIds,
      ownedDocIds,
      ownedProjectDocumentIds,
    },
  };
}

/**
 * NAV-ONLY: Get all published documents WITHOUT sections content
 * Returns both the documents and a map of documentId -> publishSlug
 * Queries from PublishedDocument table
 */
export async function getAllPublishedDocsNav(): Promise<{
  documents: YourDocData[];
  publishSlugs: Map<string, string>;
}> {
  try {
    // Query from PublishedDocument table
    const publishedDocs = await (prisma.publishedDocument.findMany as any)({
      include: {
        document: {
          include: {
            pages: {
              orderBy: { pageNumber: 'asc' },
              select: {
                id: true,
                title: true,
                pageNumber: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const publishSlugs = new Map<string, string>();
    const docsData: YourDocData[] = (publishedDocs || []).map((pubDoc: any) => {
      const doc = pubDoc.document;
      if (pubDoc.publishSlug) {
        publishSlugs.set(doc.id, pubDoc.publishSlug);
      }
      return {
        id: doc.id,
        label: doc.title,
        title: doc.title,
        description: doc.description || undefined,
        lastUpdated: doc.lastUpdated,
        content: {
          pages: (doc.pages || []).map((page: any) => ({
            id: page.id,
            title: page.title,
            pageNumber: page.pageNumber,
            sections: [], // nav-only
          })),
        },
      };
    });

    return {
      documents: docsData,
      publishSlugs,
    };
  } catch (error) {
    // If schema hasn't been migrated yet, return empty array
    console.warn('Published docs not available (schema may need migration):', error);
    return {
      documents: [],
      publishSlugs: new Map(),
    };
  }
}

/**
 * NAV-ONLY: Get projects/documents/pages WITHOUT sections content for a specific user.
 * This is dramatically smaller and faster for route navigation + sidebar trees.
 */
export async function getAllProjectsNav(userId: string): Promise<ProjectData[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      documents: {
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
            select: {
              id: true,
              title: true,
              pageNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return projects.map((project) => ({
    id: project.id,
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map((doc) => ({
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map((page) => ({
          id: page.id,
          title: page.title,
          pageNumber: page.pageNumber,
          sections: [], // nav-only
        })),
      },
    })),
  }));
}

/**
 * NAV-ONLY: Get "Your Docs" (documents without a project) WITHOUT sections content for a specific user.
 */
export async function getAllYourDocsNav(userId: string): Promise<YourDocData[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: null,
      userId,
    },
    include: {
      pages: {
        orderBy: { pageNumber: 'asc' },
        select: {
          id: true,
          title: true,
          pageNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return documents.map((doc) => ({
    id: doc.id,
    label: doc.label,
    title: doc.title,
    description: doc.description || undefined,
    lastUpdated: doc.lastUpdated,
    content: {
      pages: doc.pages.map((page) => ({
        id: page.id,
        title: page.title,
        pageNumber: page.pageNumber,
        sections: [], // nav-only
      })),
    },
  }));
}

/**
 * NAV-ONLY: Get projects + your docs WITHOUT sections content for a specific user, including shared items.
 */
export async function getAllDocsNavData(userId: string): Promise<DocsData> {
  // Fetch owned projects and docs first
  const [ownedProjects, ownedYourDocs] = await Promise.all([
    getAllProjectsNav(userId),
    getAllYourDocsNav(userId),
  ]);

  // Try to fetch shared docs, but handle errors gracefully if Share model doesn't exist
  let sharedProjects: any[] = [];
  let sharedYourDocs: any[] = [];
  try {
    [sharedProjects, sharedYourDocs] = await Promise.all([
      getSharedProjects(userId),
      getSharedDocuments(userId),
    ]);
  } catch (error) {
    // If Share model doesn't exist or Prisma client not regenerated, just skip shared docs
    console.warn('Could not fetch shared documents (Share model may not exist):', error);
    sharedProjects = [];
    sharedYourDocs = [];
  }

  // Convert shared projects to ProjectData format (nav-only)
  const sharedProjectsData: ProjectData[] = sharedProjects.map(project => ({
    id: project.id,
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map(doc => ({
      id: doc.id,
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id,
          title: page.title,
          pageNumber: page.pageNumber,
          sections: [], // nav-only
        })),
      },
    })),
  }));

  // Convert shared documents to YourDocData format (nav-only)
  // Include ALL directly shared documents, even if they belong to a project
  // (Users with direct document access should see it, even if they don't have project access)
  const sharedYourDocsData: YourDocData[] = sharedYourDocs.map(doc => ({
    id: doc.id,
    label: doc.label,
    title: doc.title,
    description: doc.description || undefined,
    lastUpdated: doc.lastUpdated,
    content: {
      pages: doc.pages.map(page => ({
        id: page.id,
        title: page.title,
        pageNumber: page.pageNumber,
        sections: [], // nav-only
      })),
    },
  }));

  // Merge owned and shared items (avoid duplicates)
  const allProjects = [...ownedProjects];
  const allYourDocs = [...ownedYourDocs];
  
  // Add shared projects that aren't already owned
  for (const sharedProject of sharedProjectsData) {
    if (!allProjects.find(p => p.id === sharedProject.id)) {
      allProjects.push(sharedProject);
    }
  }

  // Collect all document IDs that are already visible through shared projects
  const documentIdsInSharedProjects = new Set<string>();
  for (const sharedProject of sharedProjectsData) {
    for (const doc of sharedProject.documents) {
      documentIdsInSharedProjects.add(doc.id);
    }
  }

  // Add shared docs that aren't already owned and aren't already visible through shared projects
  // (If user has project access, they'll see the document through the project, not as standalone)
  for (const sharedDoc of sharedYourDocsData) {
    const isAlreadyInProjects = documentIdsInSharedProjects.has(sharedDoc.id);
    const isAlreadyOwned = allYourDocs.find(d => d.id === sharedDoc.id);
    
    if (!isAlreadyOwned && !isAlreadyInProjects) {
      allYourDocs.push(sharedDoc);
    }
  }

  // Build ownership maps for efficient lookup
  const ownedProjectIds = new Set(ownedProjects.map(p => p.id));
  const ownedDocIds = new Set(ownedYourDocs.map(d => d.id));
  
  // For project documents, check if the project is owned
  const ownedProjectDocumentIds = new Set<string>();
  for (const project of ownedProjects) {
    for (const doc of project.documents) {
      ownedProjectDocumentIds.add(doc.id);
    }
  }

  return { 
    projects: allProjects, 
    yourDocs: allYourDocs,
    ownership: {
      ownedProjectIds,
      ownedDocIds,
      ownedProjectDocumentIds,
    },
  };
}

/**
 * Helper function to check if a user has access to a document
 * Returns: { hasAccess: boolean, isOwner: boolean, isEditor: boolean, isViewer: boolean }
 */
async function checkDocumentAccess(documentId: string, userId: string) {
  // Get document with project info
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      userId: true,
      projectId: true,
    },
  });

  if (!document) {
    return { hasAccess: false, isOwner: false, isEditor: false, isViewer: false };
  }

  // Check if user is the document owner
  const isDocumentOwner = document.userId === userId;
  if (isDocumentOwner) {
    return { hasAccess: true, isOwner: true, isEditor: true, isViewer: false };
  }

  // Check if user has been directly shared with this document
  const directShare = await prisma.share.findFirst({
    where: {
      documentId: document.id,
      sharedWith: userId,
      status: 'accepted',
    },
  });

  if (directShare) {
    return {
      hasAccess: true,
      isOwner: false,
      isEditor: directShare.role === 'editor',
      isViewer: directShare.role === 'viewer',
    };
  }

  // If document belongs to a project, check project access
  if (document.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: document.projectId },
      select: { userId: true },
    });

    if (!project) {
      return { hasAccess: false, isOwner: false, isEditor: false, isViewer: false };
    }

    // Check if user is the project owner
    const isProjectOwner = project.userId === userId;
    if (isProjectOwner) {
      return { hasAccess: true, isOwner: false, isEditor: true, isViewer: false };
    }

    // Check if user has been shared with the project
    const projectShare = await prisma.share.findFirst({
      where: {
        projectId: document.projectId,
        sharedWith: userId,
        status: 'accepted',
      },
    });

    if (projectShare) {
      return {
        hasAccess: true,
        isOwner: false,
        isEditor: projectShare.role === 'editor',
        isViewer: projectShare.role === 'viewer',
      };
    }
  }

  return { hasAccess: false, isOwner: false, isEditor: false, isViewer: false };
}

/**
 * CONTENT: Get a single page with sections (for the currently viewed page).
 * Also verifies that the page belongs to a document the user has access to.
 */
export const getPageWithSections = cache(async (pageId: string, userId: string): Promise<DocumentPage | null> => {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      document: {
        select: {
          id: true,
          userId: true,
        },
      },
      sections: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!page) return null;

  // Check if user has access to the document (directly or through project)
  const { hasAccess } = await checkDocumentAccess(page.document.id, userId);
  
  if (!hasAccess) {
    return null;
  }

  return {
    id: page.id,
    title: page.title,
    pageNumber: page.pageNumber,
    sections: page.sections.map((section) => ({
      id: section.id,
      title: section.title,
      type: section.type as 'text' | 'html' | 'component',
      content: section.content,
      componentType: section.componentType || undefined,
    })),
  };
});

/**
 * Create a new project for a specific user
 */
export async function createProject(name: string, description: string, userId: string): Promise<ProjectData> {
  // UUID will be auto-generated by Prisma
  const project = await prisma.project.create({
    data: {
      label: name,
      title: name,
      description: description,
      userId,
      lastUpdated: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    include: {
      documents: {
        include: {
          pages: {
            include: {
              sections: true
            }
          }
        }
      }
    }
  });

  return {
    id: project.id, // Return UUID
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map(doc => ({
      id: doc.id, // Return UUID
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id, // Return UUID
          title: page.title,
          pageNumber: page.pageNumber,
          sections: page.sections.map(section => ({
            id: section.id, // Sections keep UUID
            title: section.title,
            type: section.type as 'text' | 'html' | 'component',
            content: section.content,
            componentType: section.componentType || undefined,
          })),
        })),
      },
    })),
  };
}

/**
 * Update a project (only if it belongs to the user)
 */
export async function updateProject(projectId: string, name: string, userId: string): Promise<ProjectData> {
  // projectId is a UUID - verify ownership first
  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!existingProject) {
    throw new Error('Project not found or access denied');
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      label: name,
      title: name,
    },
    include: {
      documents: {
        include: {
          pages: {
            include: {
              sections: true
            }
          }
        }
      }
    }
  });

  return {
    id: project.id, // Return UUID
    label: project.label,
    title: project.title,
    description: project.description || undefined,
    lastUpdated: project.lastUpdated,
    documents: project.documents.map(doc => ({
      id: doc.id, // Return UUID
      label: doc.label,
      title: doc.title,
      description: doc.description || undefined,
      lastUpdated: doc.lastUpdated,
      content: {
        pages: doc.pages.map(page => ({
          id: page.id, // Return UUID
          title: page.title,
          pageNumber: page.pageNumber,
          sections: page.sections.map(section => ({
            id: section.id, // Sections keep UUID
            title: section.title,
            type: section.type as 'text' | 'html' | 'component',
            content: section.content,
            componentType: section.componentType || undefined,
          })),
        })),
      },
    })),
  };
}

/**
 * Delete a project (only if it belongs to the user)
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  // projectId is a UUID - verify ownership first
  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!existingProject) {
    throw new Error('Project not found or access denied');
  }

  await prisma.project.delete({
    where: { id: projectId },
  });
}

/**
 * Create a new document for a specific user
 */
export async function createDocument(
  name: string,
  description: string,
  userId: string,
  projectId?: string
): Promise<DocumentData | YourDocData> {
  // If projectId is provided, verify it belongs to the user
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      throw new Error('Project not found or access denied');
    }
  }

  // UUIDs will be auto-generated by Prisma
  const document = await prisma.document.create({
    data: {
      label: name,
      title: name,
      description: description,
      userId,
      lastUpdated: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      projectId: projectId || null, // projectId is already a UUID
      pages: {
        create: {
          title: 'Untitled page',
          sections: {
            create: {
              title: '',
              type: 'html',
              content: ['<p></p>'],
            },
          },
        },
      },
    },
    include: {
      pages: {
        include: {
          sections: true
        }
      }
    }
  });

  return {
    id: document.id, // Return UUID
    label: document.label,
    title: document.title,
    description: document.description || undefined,
    lastUpdated: document.lastUpdated,
    content: {
      pages: document.pages.map(page => ({
        id: page.id, // Return UUID
        title: page.title,
        sections: page.sections.map(section => ({
          id: section.id, // UUID
          title: section.title,
          type: section.type as 'text' | 'html' | 'component',
          content: section.content,
          componentType: section.componentType || undefined,
        })),
      })),
    },
  };
}

/**
 * Update a document (only if it belongs to the user)
 */
export async function updateDocument(
  docId: string,
  name: string,
  userId: string,
  projectId?: string
): Promise<DocumentData | YourDocData> {
  // docId is a UUID - verify ownership first
  const existingDocument = await prisma.document.findFirst({
    where: { id: docId, userId },
  });

  if (!existingDocument) {
    throw new Error('Document not found or access denied');
  }

  const document = await prisma.document.update({
    where: { id: docId },
    data: {
      label: name,
      title: name,
    },
      include: {
        pages: {
          include: {
            sections: true
          }
        }
      }
    });

  return {
    id: document.id, // Return UUID
    label: document.label,
    title: document.title,
    description: document.description || undefined,
    lastUpdated: document.lastUpdated,
    content: {
      pages: document.pages.map(page => ({
        id: page.id, // Return UUID
        title: page.title,
        sections: page.sections.map(section => ({
          id: section.id, // UUID
          title: section.title,
          type: section.type as 'text' | 'html' | 'component',
          content: section.content,
          componentType: section.componentType || undefined,
        })),
      })),
    },
  };
}

/**
 * Delete a document (only if it belongs to the user)
 */
export async function deleteDocument(docId: string, userId: string, projectId?: string): Promise<void> {
  // docId is a UUID - verify ownership first
  const existingDocument = await prisma.document.findFirst({
    where: { id: docId, userId },
  });

  if (!existingDocument) {
    throw new Error('Document not found or access denied');
  }

  await prisma.document.delete({
    where: { id: docId },
  });
}

/**
 * Add a new page to a document (only if it belongs to the user)
 */
export async function addPageToDocument(
  docId: string,
  title: string,
  userId: string,
  content?: string[],
  projectId?: string
): Promise<DocumentPage> {
  // Check if user has access to the document (directly or through project) and is editor
  const { hasAccess, isEditor } = await checkDocumentAccess(docId, userId);

  if (!hasAccess || !isEditor) {
    throw new Error('Document not found or access denied. Only editors can add pages.');
  }

  // Verify document exists
  const existingDocument = await prisma.document.findFirst({
    where: { id: docId },
  });

  if (!existingDocument) {
    throw new Error('Document not found');
  }

  const sectionContent = content || [''];

  // Get the current maximum page number for this document
  const maxPage = await prisma.page.findFirst({
    where: { documentId: docId },
    orderBy: { pageNumber: 'desc' },
    select: { pageNumber: true },
  });

  const nextPageNumber = maxPage ? maxPage.pageNumber + 1 : 1;

  // UUID will be auto-generated by Prisma
  const page = await prisma.page.create({
    data: {
      title: title.trim(),
      pageNumber: nextPageNumber,
      documentId: docId,
      sections: {
        create: {
          title: '',
          type: 'text',
          content: Array.isArray(sectionContent) ? sectionContent : [sectionContent],
        },
      },
    },
    include: {
      sections: true
    }
  });

  // Update document lastUpdated
  await prisma.document.update({
    where: { id: docId },
    data: {
      lastUpdated: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  });

  return {
    id: page.id, // Return UUID
    title: page.title,
    pageNumber: page.pageNumber,
    sections: page.sections.map(section => ({
      id: section.id, // Sections keep UUID
      title: section.title,
      type: section.type as 'text' | 'html' | 'component',
      content: section.content,
      componentType: section.componentType || undefined,
    })),
  };
}

/**
 * Update a page in a document (only if it belongs to the user)
 */
export async function updatePage(
  docId: string,
  pageId: string,
  title: string,
  sections: DocumentSection[],
  userId: string,
  projectId?: string
): Promise<DocumentPage> {
  // Check if user has access to the document (directly or through project) and is editor
  const { hasAccess, isEditor } = await checkDocumentAccess(docId, userId);

  if (!hasAccess || !isEditor) {
    throw new Error('Document not found or access denied. Only editors can update pages.');
  }

  // Verify document exists
  const existingDocument = await prisma.document.findFirst({
    where: { id: docId },
  });

  if (!existingDocument) {
    throw new Error('Document not found');
  }

  // Check if page exists and belongs to the document
  const existingPage = await prisma.page.findFirst({
    where: { id: pageId, documentId: docId },
  });

  let page;
  if (existingPage) {
    // Delete existing sections and create new ones
    await prisma.section.deleteMany({
      where: { pageId },
    });

    page = await prisma.page.update({
      where: { id: pageId },
      data: {
        title,
        // Preserve existing page number
        sections: {
          create: sections.map(section => ({
            title: section.title,
            type: section.type,
            content: section.content,
            componentType: section.componentType || null,
          })),
        },
      },
      include: {
        sections: true
      }
    });
  } else {
    // Get the current maximum page number for this document
    const maxPage = await prisma.page.findFirst({
      where: { documentId: docId },
      orderBy: { pageNumber: 'desc' },
      select: { pageNumber: true },
    });

    const nextPageNumber = maxPage ? maxPage.pageNumber + 1 : 1;

    // Create new page if it doesn't exist (UUID will be auto-generated)
    page = await prisma.page.create({
      data: {
        id: pageId, // Use provided pageId as UUID
        title,
        pageNumber: nextPageNumber,
        documentId: docId,
        sections: {
          create: sections.map(section => ({
            title: section.title,
            type: section.type,
            content: section.content,
            componentType: section.componentType || null,
          })),
        },
      },
      include: {
        sections: true
      }
    });
  }

  // Update document lastUpdated
  await prisma.document.update({
    where: { id: docId },
    data: {
      lastUpdated: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  });

  return {
    id: page.id, // Return UUID
    title: page.title,
    pageNumber: page.pageNumber,
    sections: page.sections.map(section => ({
      id: section.id, // UUID
      title: section.title,
      type: section.type as 'text' | 'html' | 'component',
      content: section.content,
      componentType: section.componentType || undefined,
    })),
  };
}

