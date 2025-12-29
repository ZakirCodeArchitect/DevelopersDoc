import { NextRequest, NextResponse } from 'next/server';
import { shareDocument, getDocumentShares, removeShare } from '@/lib/shares';
import { getCurrentUser, getUserByEmail } from '@/lib/users';
import { prisma } from '@/lib/db';
import { sendShareInvitationEmail } from '@/lib/email';

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

    // Check document exists and get user's access level
    const document = await prisma.document.findFirst({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user is document owner
    const isDocOwner = document.userId === user.id;
    
    // Check if user has direct document editor access
    const directDocShare = await prisma.share.findFirst({
      where: {
        documentId,
        sharedWith: user.id,
        status: 'accepted',
        role: 'editor',
      },
    });
    const hasDirectDocEditorAccess = !!directDocShare;

    // Check if document belongs to a project and user has project editor access
    let hasProjectEditorAccess = false;
    if (document.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: document.projectId },
      });

      if (project) {
        // Check if user is project owner
        if (project.userId === user.id) {
          hasProjectEditorAccess = true;
        } else {
          // Check if user has project editor access
          const projectShare = await prisma.share.findFirst({
            where: {
              projectId: document.projectId,
              sharedWith: user.id,
              status: 'accepted',
              role: 'editor',
            },
          });
          hasProjectEditorAccess = !!projectShare;
        }
      }
    }

    // Check if user is trying to manage their own access
    const targetUser = await getUserByEmail(email.toLowerCase().trim());
    const isManagingSelf = targetUser && targetUser.id === user.id;

    // Permission check:
    // - Document owners can share with anyone
    // - Project editors (and project owners) can share documents in the project with anyone
    // - Direct document editors can only manage their own access
    // - Viewers cannot share/manage access
    if (!isDocOwner && !hasProjectEditorAccess && !hasDirectDocEditorAccess) {
      return NextResponse.json(
        { error: 'Access denied. Only owners and editors can manage shares.' },
        { status: 403 }
      );
    }

    // Direct document editors can only manage their own access (not project editors)
    if (!isDocOwner && !hasProjectEditorAccess && hasDirectDocEditorAccess && !isManagingSelf) {
      return NextResponse.json(
        { error: 'Access denied. Document editors can only manage their own access.' },
        { status: 403 }
      );
    }

    // Share the document
    const share = await shareDocument({
      documentId,
      email: email.toLowerCase().trim(),
      role,
      sharedByUserId: user.id,
    });

    // Send invitation email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const signUpUrl = `${baseUrl}/sign-up?redirect=/docs/${documentId}`;
      
      await sendShareInvitationEmail({
        recipientEmail: email.toLowerCase().trim(),
        sharerName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.firstName || user.email,
        itemName: document.title,
        itemType: 'document',
        role,
        signUpUrl,
      });
    } catch (emailError) {
      // Log error but don't fail the share operation
      console.error('Failed to send invitation email:', emailError);
    }

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

    // Verify the user has access to this document (owner, direct share, or project access)
    const document = await prisma.document.findFirst({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user owns the document
    const isDocOwner = document.userId === user.id;
    
    // Check if user has direct document access
    const hasDirectAccess = await prisma.share.findFirst({
      where: {
        documentId,
        sharedWith: user.id,
        status: 'accepted',
      },
    });

    // Check if user has project access (if document belongs to a project)
    let hasProjectAccess = false;
    if (document.projectId && !isDocOwner && !hasDirectAccess) {
      const project = await prisma.project.findUnique({
        where: { id: document.projectId },
      });

      if (project) {
        if (project.userId === user.id) {
          hasProjectAccess = true;
        } else {
          const projectShare = await prisma.share.findFirst({
            where: {
              projectId: document.projectId,
              sharedWith: user.id,
              status: 'accepted',
            },
          });
          hasProjectAccess = !!projectShare;
        }
      }
    }

    if (!isDocOwner && !hasDirectAccess && !hasProjectAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all shares for this document
    const shares = await getDocumentShares(documentId);

    // Get owner information
    const owner = await prisma.user.findUnique({
      where: { id: document.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      shares,
      owner: owner ? {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        imageUrl: owner.imageUrl,
        role: 'owner',
      } : null,
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

    // Check document exists and get user's access level
    const document = await prisma.document.findFirst({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user is document owner
    const isDocOwner = document.userId === user.id;
    
    // Check if user has project editor/owner access
    let hasProjectEditorAccess = false;
    if (document.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: document.projectId },
      });

      if (project) {
        if (project.userId === user.id) {
          hasProjectEditorAccess = true;
        } else {
          const projectShare = await prisma.share.findFirst({
            where: {
              projectId: document.projectId,
              sharedWith: user.id,
              status: 'accepted',
              role: 'editor',
            },
          });
          hasProjectEditorAccess = !!projectShare;
        }
      }
    }
    
    // Get the share to check permissions
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        sharedWith: true,
        documentId: true,
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to remove their own share
    const isRemovingSelf = share.sharedWith === user.id;

    // Check if user has direct document share (editor or viewer)
    const userDocShare = await prisma.share.findFirst({
      where: {
        documentId,
        sharedWith: user.id,
        status: 'accepted',
      },
    });
    const hasDirectDocShare = !!userDocShare;

    // Permission check:
    // - Document owners can remove any share
    // - Project editors/owners can remove any share for documents in their project
    // - Direct document editors/viewers can only remove their own share
    if (!isDocOwner && !hasProjectEditorAccess) {
      if (!hasDirectDocShare || !isRemovingSelf) {
        return NextResponse.json(
          { error: 'Access denied. Only owners and project editors can remove other shares. You can only remove your own access.' },
          { status: 403 }
        );
      }
    }

    // Remove the share
    // Pass true if user is document owner or has project editor access
    await removeShare(shareId, user.id, isDocOwner || hasProjectEditorAccess);

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

