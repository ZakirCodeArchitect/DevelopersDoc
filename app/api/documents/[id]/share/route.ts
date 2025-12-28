import { NextRequest, NextResponse } from 'next/server';
import { shareDocument, getDocumentShares, removeShare } from '@/lib/shares';
import { getCurrentUser } from '@/lib/users';
import { prisma } from '@/lib/db';

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
    const documentId = resolvedParams.id;
    const body = await request.json();
    const { email, role = 'viewer' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== 'viewer' && role !== 'editor') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "viewer" or "editor"' },
        { status: 400 }
      );
    }

    // Verify the user owns this document
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Share the document
    const share = await shareDocument({
      documentId,
      email: email.toLowerCase().trim(),
      role,
      sharedByUserId: user.id,
    });

    // TODO: Send invitation email here
    // For now, we'll just return success
    // You can integrate Resend or another email service

    return NextResponse.json({
      success: true,
      share,
      message: share.status === 'accepted' 
        ? 'Document shared successfully'
        : 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    return NextResponse.json(
      { error: 'Failed to share document' },
      { status: 500 }
    );
  }
}

export async function GET(
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
    const documentId = resolvedParams.id;

    // Verify the user owns this document
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Get all shares for this document
    const shares = await getDocumentShares(documentId);

    return NextResponse.json({
      success: true,
      shares,
    });
  } catch (error) {
    console.error('Error getting document shares:', error);
    return NextResponse.json(
      { error: 'Failed to get document shares' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const documentId = resolvedParams.id;
    const body = await request.json();
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Remove the share
    await removeShare(shareId, user.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error removing share:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

