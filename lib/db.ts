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
 * Get all projects with their documents
 */
export async function getAllProjects(): Promise<ProjectData[]> {
  const projects = await prisma.project.findMany({
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
 * Get all "Your Docs" (documents without a project)
 */
export async function getAllYourDocs(): Promise<YourDocData[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: null,
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
 * Get all docs data (projects + your docs)
 */
export async function getAllDocsData(): Promise<DocsData> {
  const [projects, yourDocs] = await Promise.all([
    getAllProjects(),
    getAllYourDocs(),
  ]);

  return {
    projects,
    yourDocs,
  };
}

/**
 * NAV-ONLY: Get projects/documents/pages WITHOUT sections content.
 * This is dramatically smaller and faster for route navigation + sidebar trees.
 */
export async function getAllProjectsNav(): Promise<ProjectData[]> {
  const projects = await prisma.project.findMany({
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
 * NAV-ONLY: Get "Your Docs" (documents without a project) WITHOUT sections content.
 */
export async function getAllYourDocsNav(): Promise<YourDocData[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: null,
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
 * NAV-ONLY: Get projects + your docs WITHOUT sections content.
 */
export async function getAllDocsNavData(): Promise<DocsData> {
  const [projects, yourDocs] = await Promise.all([getAllProjectsNav(), getAllYourDocsNav()]);
  return { projects, yourDocs };
}

/**
 * CONTENT: Get a single page with sections (for the currently viewed page).
 */
export const getPageWithSections = cache(async (pageId: string): Promise<DocumentPage | null> => {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      title: true,
      pageNumber: true,
      sections: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          componentType: true,
        },
      },
    },
  });

  if (!page) return null;

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
 * Create a new project
 */
export async function createProject(name: string, description: string): Promise<ProjectData> {
  // UUID will be auto-generated by Prisma
  const project = await prisma.project.create({
    data: {
      label: name,
      title: name,
      description: description,
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
 * Update a project
 */
export async function updateProject(projectId: string, name: string): Promise<ProjectData> {
  // projectId is a UUID
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
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  // projectId is a UUID
  await prisma.project.delete({
    where: { id: projectId },
  });
}

/**
 * Create a new document
 */
export async function createDocument(
  name: string,
  description: string,
  projectId?: string
): Promise<DocumentData | YourDocData> {
  // UUIDs will be auto-generated by Prisma
  const document = await prisma.document.create({
    data: {
      label: name,
      title: name,
      description: description,
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
 * Update a document
 */
export async function updateDocument(
  docId: string,
  name: string,
  projectId?: string
): Promise<DocumentData | YourDocData> {
  // docId is a UUID
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
 * Delete a document
 */
export async function deleteDocument(docId: string, projectId?: string): Promise<void> {
  // docId is a UUID
  await prisma.document.delete({
    where: { id: docId },
  });
}

/**
 * Add a new page to a document
 */
export async function addPageToDocument(
  docId: string,
  title: string,
  content?: string[],
  projectId?: string
): Promise<DocumentPage> {
  // docId is a UUID
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
 * Update a page in a document
 */
export async function updatePage(
  docId: string,
  pageId: string,
  title: string,
  sections: DocumentSection[],
  projectId?: string
): Promise<DocumentPage> {
  // docId and pageId are UUIDs
  // Check if page exists
  const existingPage = await prisma.page.findUnique({
    where: { id: pageId },
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

