import { NextRequest, NextResponse } from 'next/server';
import { addPageToDocument, prisma } from '@/lib/db';

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

    // docId is a UUID
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Default content if not provided
    const sectionContent = content || [''];

    // Add page to document (addPageToDocument expects UUID)
    const newPage = await addPageToDocument(
      docId,
      title.trim(),
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

