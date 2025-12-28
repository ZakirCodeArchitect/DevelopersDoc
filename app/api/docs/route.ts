import { NextRequest, NextResponse } from 'next/server';
import { createDocument } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, projectId } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create new document (createDocument will verify project ownership if projectId is provided)
    if (projectId) {
      const newDoc = await createDocument(name, description, user.id, projectId);

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
      const newDoc = await createDocument(name, description, user.id);

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

