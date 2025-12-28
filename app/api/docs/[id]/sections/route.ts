import { NextRequest, NextResponse } from 'next/server';
import { addPageToDocument, prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Default content if not provided
    const sectionContent = content || [''];

    // Add page to document (addPageToDocument will verify document ownership)
    const newPage = await addPageToDocument(
      docId,
      title.trim(),
      user.id,
      Array.isArray(sectionContent) ? sectionContent : [sectionContent],
      projectId
    );

    // Get updated document by UUID
    const updatedDoc = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        pages: {
          include: {
            sections: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      page: newPage,
      doc: updatedDoc,
    });
  } catch (error) {
    console.error('Error adding page:', error);
    return NextResponse.json(
      { error: 'Failed to add page' },
      { status: 500 }
    );
  }
}

