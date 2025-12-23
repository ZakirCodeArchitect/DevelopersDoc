import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import docsData from '@/data/docs.json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const docId = resolvedParams.id;
    const body = await request.json();
    const { title, content, projectId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate page ID from title
    const pageId = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Default content if not provided
    const sectionContent = content || [''];

    // Create a new page with a default section (without duplicate title)
    const newPage = {
      id: pageId,
      title: title.trim(),
      sections: [{
        id: `${pageId}-section`,
        title: '', // Don't duplicate the page title as section title
        type: 'text' as const,
        content: Array.isArray(sectionContent) ? sectionContent : [sectionContent],
      }],
    };

    // If projectId is provided, add section to document in project
    if (projectId) {
      const project = docsData.projects.find((p) => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const doc = project.documents?.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Migrate old structure if needed (for backward compatibility)
      const docContent = doc.content as any;
      if (docContent.sections && !docContent.pages) {
        docContent.pages = docContent.sections.map((section: any) => ({
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
        delete docContent.sections;
      }

      // Ensure pages array exists
      if (!docContent.pages) {
        docContent.pages = [];
      }

      // Check if page with same ID already exists
      if (docContent.pages.some((p: any) => p.id === pageId)) {
        // If exists, append a number to make it unique
        let uniqueId = pageId;
        let counter = 1;
        while (docContent.pages.some((p: any) => p.id === uniqueId)) {
          uniqueId = `${pageId}-${counter}`;
          counter++;
        }
        newPage.id = uniqueId;
        newPage.sections[0].id = `${uniqueId}-section`;
      }

      // Add page to document
      docContent.pages.push(newPage);

      // Update lastUpdated date
      doc.lastUpdated = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        page: newPage,
        doc,
      });
    } else {
      // Add page to document in "Your Docs"
      const doc = docsData.yourDocs.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Migrate old structure if needed (for backward compatibility)
      const docContent = doc.content as any;
      if (docContent.sections && !docContent.pages) {
        docContent.pages = docContent.sections.map((section: any) => ({
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
        delete docContent.sections;
      }

      // Ensure pages array exists
      if (!docContent.pages) {
        docContent.pages = [];
      }

      // Check if page with same ID already exists
      if (docContent.pages.some((p: any) => p.id === pageId)) {
        // If exists, append a number to make it unique
        let uniqueId = pageId;
        let counter = 1;
        while (docContent.pages.some((p: any) => p.id === uniqueId)) {
          uniqueId = `${pageId}-${counter}`;
          counter++;
        }
        newPage.id = uniqueId;
        newPage.sections[0].id = `${uniqueId}-section`;
      }

      // Add page to document
      docContent.pages.push(newPage);

      // Update lastUpdated date
      doc.lastUpdated = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        page: newPage,
        doc,
      });
    }
  } catch (error) {
    console.error('Error adding page:', error);
    return NextResponse.json(
      { error: 'Failed to add page' },
      { status: 500 }
    );
  }
}

