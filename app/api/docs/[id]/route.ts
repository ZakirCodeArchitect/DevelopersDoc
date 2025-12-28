import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { updateDocument, deleteDocument, prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const docId = resolvedParams.id;
    const body = await request.json();
    const { name, projectId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // docId is a UUID
    const existingDoc = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
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
    }

    // Update document (updateDocument expects slug and handles slug generation)
    const doc = await updateDocument(docId, name, projectId);

    const newHref = projectId 
      ? `/docs/projects/${projectId}/${doc.id}`
      : `/docs/${doc.id}`;

    return NextResponse.json({
      success: true,
      doc,
      newHref,
    });
  } catch (error) {
    console.error('Error renaming document:', error);
    return NextResponse.json(
      { error: 'Failed to rename document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const docId = resolvedParams.id;
    const body = await request.json();
    const { projectId } = body;

    // docId is a UUID
    const existingDoc = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document (deleteDocument expects slug)
    await deleteDocument(docId, projectId);

    // Revalidate the project page and docs pages to clear cache
    if (projectId) {
      revalidatePath(`/docs/projects/${projectId}`);
    }
    revalidatePath('/docs', 'layout');

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

