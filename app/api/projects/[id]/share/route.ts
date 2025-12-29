import { NextRequest, NextResponse } from 'next/server';
import { shareProject, getProjectShares, removeShare } from '@/lib/shares';
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
    const projectId = resolvedParams.id;
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

    // Check project exists and get user's access level
    const project = await prisma.project.findFirst({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user is owner
    const isOwner = project.userId === user.id;
    
    // Check if user has editor access
    const userShare = await prisma.share.findFirst({
      where: {
        projectId,
        sharedWith: user.id,
        status: 'accepted',
        role: 'editor',
      },
    });
    const isEditor = !!userShare;

    // Check if user is trying to manage their own access
    const targetUser = await getUserByEmail(email.toLowerCase().trim());
    const isManagingSelf = targetUser && targetUser.id === user.id;

    // Permission check:
    // - Owners can share with anyone
    // - Editors can share with anyone (same as owners for sharing)
    // - Viewers cannot share/manage access
    if (!isOwner && !isEditor) {
      return NextResponse.json(
        { error: 'Access denied. Only owners and editors can manage shares.' },
        { status: 403 }
      );
    }

    // Share the project
    const share = await shareProject({
      projectId,
      email: email.toLowerCase().trim(),
      role,
      sharedByUserId: user.id,
    });

    // Send invitation email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const signUpUrl = `${baseUrl}/sign-up?redirect=/docs/projects/${projectId}`;
      
      await sendShareInvitationEmail({
        recipientEmail: email.toLowerCase().trim(),
        sharerName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.firstName || user.email,
        itemName: project.title,
        itemType: 'project',
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
        ? 'Project shared successfully'
        : 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error sharing project:', error);
    return NextResponse.json(
      { error: 'Failed to share project' },
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
    const projectId = resolvedParams.id;

    // Verify the user owns this project OR has been shared with it
    const project = await prisma.project.findFirst({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user owns the project or has been shared with it
    const isOwner = project.userId === user.id;
    const hasAccess = await prisma.share.findFirst({
      where: {
        projectId,
        sharedWith: user.id,
        status: 'accepted',
      },
    });

    if (!isOwner && !hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all shares for this project
    const shares = await getProjectShares(projectId);

    // Get owner information
    const owner = await prisma.user.findUnique({
      where: { id: project.userId },
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
    console.error('Error getting project shares:', error);
    return NextResponse.json(
      { error: 'Failed to get project shares' },
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
    const projectId = resolvedParams.id;
    const body = await request.json();
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Check project exists and get user's access level
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user is owner
    const isOwner = project.userId === user.id;
    
    // Check if user has editor access
    const userShare = await prisma.share.findFirst({
      where: {
        projectId,
        sharedWith: user.id,
        status: 'accepted',
        role: 'editor',
      },
    });
    const isEditor = !!userShare;
    
    // Get the share to check permissions
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        sharedWith: true,
        projectId: true,
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

    // Permission check:
    // - Owners can remove any share
    // - Editors can remove any share (same as owners for managing shares)
    // - Viewers can only remove their own share
    if (!isOwner && !isEditor) {
      // Check if user has any share (viewer)
      const hasAnyShare = await prisma.share.findFirst({
        where: {
          projectId,
          sharedWith: user.id,
          status: 'accepted',
        },
      });
      
      if (!hasAnyShare || !isRemovingSelf) {
        return NextResponse.json(
          { error: 'Access denied. Only owners and editors can remove other shares. You can only remove your own access.' },
          { status: 403 }
        );
      }
    }

    // Remove the share
    // Pass true if user is owner or editor (both can remove any share)
    await removeShare(shareId, user.id, isOwner || isEditor);

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

