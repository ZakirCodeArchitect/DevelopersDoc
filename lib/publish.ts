import { prisma } from './db';

export interface PublishValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates if a document meets the criteria to be published
 */
export async function validateDocumentForPublishing(
  documentId: string
): Promise<PublishValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch document with all pages and sections
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      pages: {
        include: {
          sections: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { pageNumber: 'asc' },
      },
    },
  });

  if (!document) {
    return {
      isValid: false,
      errors: ['Document not found'],
      warnings: [],
    };
  }

  // CRITICAL REQUIREMENTS (errors - must be fixed)
  
  // 1. Document must have a title
  if (!document.title || document.title.trim().length === 0) {
    errors.push('Document must have a title');
  }

  // 2. Document must have at least one page
  if (!document.pages || document.pages.length === 0) {
    errors.push('Document must have at least one page');
  }

  // 3. Each page must have at least one section
  const pagesWithoutSections = document.pages.filter(
    (page) => !page.sections || page.sections.length === 0
  );
  if (pagesWithoutSections.length > 0) {
    errors.push(
      `All pages must have at least one section. Pages without sections: ${pagesWithoutSections.map((p) => p.title).join(', ')}`
    );
  }

  // 4. Each section must have content
  const sectionsWithoutContent: Array<{ pageTitle: string; sectionTitle: string; sectionIndex: number }> = [];
  document.pages.forEach((page) => {
    page.sections.forEach((section, index) => {
      const hasContent =
        section.content &&
        Array.isArray(section.content) &&
        section.content.length > 0 &&
        section.content.some((contentItem) => {
          if (typeof contentItem === 'string') {
            return contentItem.trim().length > 0;
          }
          return false;
        });

      if (!hasContent) {
        const sectionTitle = section.title && section.title.trim() 
          ? section.title.trim() 
          : `Section ${index + 1} (no title)`;
        sectionsWithoutContent.push({
          pageTitle: page.title,
          sectionTitle,
          sectionIndex: index + 1,
        });
      }
    });
  });

  if (sectionsWithoutContent.length > 0) {
    // Create a clearer error message
    if (sectionsWithoutContent.length === 1) {
      const { pageTitle, sectionTitle } = sectionsWithoutContent[0];
      errors.push(
        `The page "${pageTitle}" has an empty section: "${sectionTitle}". Please add content to this section before publishing.`
      );
    } else {
      const sectionsList = sectionsWithoutContent
        .map(({ pageTitle, sectionTitle }) => `"${pageTitle}" → "${sectionTitle}"`)
        .join(', ');
      errors.push(
        `Multiple sections are empty and need content: ${sectionsList}. Please add content to these sections before publishing.`
      );
    }
  }

  // 5. Minimum content length requirement
  let totalContentLength = 0;
  document.pages.forEach((page) => {
    page.sections.forEach((section) => {
      if (section.content && Array.isArray(section.content)) {
        section.content.forEach((contentItem) => {
          if (typeof contentItem === 'string') {
            totalContentLength += contentItem.length;
          }
        });
      }
    });
  });

  const MIN_CONTENT_LENGTH = 200; // Minimum 200 characters
  if (totalContentLength < MIN_CONTENT_LENGTH) {
    errors.push(
      `Document must have at least ${MIN_CONTENT_LENGTH} characters of content (currently has ${totalContentLength})`
    );
  }

  // RECOMMENDATIONS (warnings - should be addressed but not blocking)
  
  // 1. Description is recommended
  if (!document.description || document.description.trim().length === 0) {
    warnings.push('Adding a description will help users understand what your documentation is about');
  }

  // 2. Minimum number of pages recommended
  const MIN_RECOMMENDED_PAGES = 2;
  if (document.pages.length < MIN_RECOMMENDED_PAGES) {
    warnings.push(
      `Consider adding more pages (recommended: at least ${MIN_RECOMMENDED_PAGES} pages)`
    );
  }

  // 3. Page titles should be descriptive
  const shortPageTitles = document.pages.filter(
    (page) => !page.title || page.title.trim().length < 3
  );
  if (shortPageTitles.length > 0) {
    warnings.push('Some page titles are very short. Consider making them more descriptive');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generates a URL-friendly slug from a document title
 */
export function generatePublishSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensures a slug is unique by appending a number if needed
 * Checks the PublishedDocument table for uniqueness
 */
export async function ensureUniqueSlug(baseSlug: string, excludeDocumentId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await (prisma.publishedDocument.findFirst as any)({
      where: {
        publishSlug: slug,
        ...(excludeDocumentId ? { documentId: { not: excludeDocumentId } } : {}),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

