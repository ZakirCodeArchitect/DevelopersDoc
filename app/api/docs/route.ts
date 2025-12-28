import { NextRequest, NextResponse } from 'next/server';
import { createDocument, prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectId } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // If projectId is provided, verify project exists (projectId is a UUID)
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Create new document (createDocument expects slug)
      const newDoc = await createDocument(name, description, projectId);

      // Get the first page slug from the created document
      const firstPage = newDoc.content.pages[0];
      const href = `/docs/projects/${projectId}/${newDoc.id}/${firstPage.id}`;

      return NextResponse.json({
        success: true,
        doc: newDoc,
        href,
      });
    } else {
      // Create document in "Your Docs" (createDocument handles unique ID generation)
      const newDoc = await createDocument(name, description);

      // Get the first page slug from the created document
      const firstPage = newDoc.content.pages[0];
      const href = `/docs/${newDoc.id}/${firstPage.id}`;

      return NextResponse.json({
        success: true,
        doc: newDoc,
        href,
      });
    }
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

