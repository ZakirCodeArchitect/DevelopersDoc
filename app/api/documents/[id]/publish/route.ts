import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/users';
import { prisma } from '@/lib/db';
import {
  validateDocumentForPublishing,
  generatePublishSlug,
  ensureUniqueSlug,
} from '@/lib/publish';

/**
 * GET /api/documents/[id]/publish
 * Get publish status and validation for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // Check document exists and user owns it
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
      include: {
        publishedDocument: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Validate document for publishing
    const validation = await validateDocumentForPublishing(documentId);

    return NextResponse.json({
      isPublished: !!document.publishedDocument,
      publishSlug: document.publishedDocument?.publishSlug || null,
      publishedAt: document.publishedDocument?.publishedAt || null,
      validation,
    });
  } catch (error) {
    console.error('Error fetching publish status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/publish
 * Publish a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;
    const body = await request.json();
    const { customSlug } = body;

    // Check document exists and user owns it
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Validate document for publishing
    const validation = await validateDocumentForPublishing(documentId);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Document does not meet publishing requirements',
          validation,
        },
        { status: 400 }
      );
    }

    // Generate or use custom slug
    let publishSlug: string;
    if (customSlug && typeof customSlug === 'string' && customSlug.trim().length > 0) {
      // Clean the custom slug
      const cleanedSlug = generatePublishSlug(customSlug);
      publishSlug = await ensureUniqueSlug(cleanedSlug, documentId);
    } else {
      // Generate from title
      const baseSlug = generatePublishSlug(document.title);
      publishSlug = await ensureUniqueSlug(baseSlug, documentId);
    }

    // Create or update published document entry
    const publishedDoc = await (prisma.publishedDocument.upsert as any)({
      where: { documentId },
      update: {
        publishSlug,
        updatedAt: new Date(),
      },
      create: {
        documentId,
        publishSlug,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        isPublished: true,
        publishSlug: publishedDoc.publishSlug,
        publishedAt: publishedDoc.publishedAt,
      },
    });
  } catch (error) {
    console.error('Error publishing document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/publish
 * Unpublish a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // Check document exists and user owns it
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or you do not have permission' },
        { status: 404 }
      );
    }

    // Unpublish the document by deleting from PublishedDocument table
    await (prisma.publishedDocument.deleteMany as any)({
      where: { documentId },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        isPublished: false,
      },
    });
  } catch (error) {
    console.error('Error unpublishing document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

