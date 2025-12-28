import { prisma } from './db';
import { getUserByEmail } from './users';

export interface ShareDocumentParams {
  documentId: string;
  email: string;
  role?: 'viewer' | 'editor';
  sharedByUserId: string;
}

export interface ShareProjectParams {
  projectId: string;
  email: string;
  role?: 'viewer' | 'editor';
  sharedByUserId: string;
}

/**
 * Share a document with a user by email
 */
export async function shareDocument({ documentId, email, role = 'viewer', sharedByUserId }: ShareDocumentParams) {
  // Check if user exists with this email
  const sharedWithUser = await getUserByEmail(email);
  
  // Check if share already exists
  const existingShare = await prisma.share.findFirst({
    where: {
      email,
      documentId,
    },
  });

  if (existingShare) {
    // Update existing share
    const share = await prisma.share.update({
      where: { id: existingShare.id },
      data: {
        role,
        status: sharedWithUser ? 'accepted' : 'pending',
        sharedWith: sharedWithUser?.id || null,
        updatedAt: new Date(),
      },
    });
    return share;
  }

  // Create new share
  const share = await prisma.share.create({
    data: {
      email,
      documentId,
      sharedBy: sharedByUserId,
      sharedWith: sharedWithUser?.id || null,
      role,
      status: sharedWithUser ? 'accepted' : 'pending',
    },
  });

  return share;
}

/**
 * Share a project with a user by email
 */
export async function shareProject({ projectId, email, role = 'viewer', sharedByUserId }: ShareProjectParams) {
  // Check if user exists with this email
  const sharedWithUser = await getUserByEmail(email);
  
  // Check if share already exists
  const existingShare = await prisma.share.findFirst({
    where: {
      email,
      projectId,
    },
  });

  if (existingShare) {
    // Update existing share
    const share = await prisma.share.update({
      where: { id: existingShare.id },
      data: {
        role,
        status: sharedWithUser ? 'accepted' : 'pending',
        sharedWith: sharedWithUser?.id || null,
        updatedAt: new Date(),
      },
    });
    return share;
  }

  // Create new share
  const share = await prisma.share.create({
    data: {
      email,
      projectId,
      sharedBy: sharedByUserId,
      sharedWith: sharedWithUser?.id || null,
      role,
      status: sharedWithUser ? 'accepted' : 'pending',
    },
  });

  return share;
}

/**
 * Get all shares for a document
 */
export async function getDocumentShares(documentId: string) {
  return prisma.share.findMany({
    where: { documentId },
    include: {
      sharedWithUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all shares for a project
 */
export async function getProjectShares(projectId: string) {
  return prisma.share.findMany({
    where: { projectId },
    include: {
      sharedWithUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Remove a share (unshare)
 */
export async function removeShare(shareId: string, userId: string) {
  // Verify the user has permission to remove this share (must be the owner)
  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: {
      project: { select: { userId: true } },
      document: { select: { userId: true } },
    },
  });

  if (!share) {
    throw new Error('Share not found');
  }

  const ownerId = share.projectId ? share.project?.userId : share.document?.userId;
  if (ownerId !== userId) {
    throw new Error('Unauthorized to remove this share');
  }

  return prisma.share.delete({
    where: { id: shareId },
  });
}

/**
 * Accept a share invitation (called when a user signs up/signs in)
 * This should be called from the webhook or user sync
 */
export async function acceptPendingShares(userEmail: string, userId: string) {
  // Find all pending shares for this email
  const pendingShares = await prisma.share.findMany({
    where: {
      email: userEmail,
      status: 'pending',
    },
  });

  // Update all pending shares to accepted
  if (pendingShares.length > 0) {
    await prisma.share.updateMany({
      where: {
        email: userEmail,
        status: 'pending',
      },
      data: {
        status: 'accepted',
        sharedWith: userId,
        updatedAt: new Date(),
      },
    });
  }

  return pendingShares;
}

/**
 * Get all documents shared with a user
 */
export async function getSharedDocuments(userId: string) {
  // First get all accepted shares for this user
  const shares = await prisma.share.findMany({
    where: {
      sharedWith: userId,
      status: 'accepted',
      documentId: { not: null },
    },
    select: {
      documentId: true,
    },
  });

  const documentIds = shares.map(s => s.documentId).filter((id): id is string => id !== null);

  if (documentIds.length === 0) {
    return [];
  }

  return prisma.document.findMany({
    where: {
      id: { in: documentIds },
    },
    include: {
      pages: {
        orderBy: { pageNumber: 'asc' },
        select: {
          id: true,
          title: true,
          pageNumber: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all projects shared with a user
 */
export async function getSharedProjects(userId: string) {
  // First get all accepted shares for this user
  const shares = await prisma.share.findMany({
    where: {
      sharedWith: userId,
      status: 'accepted',
      projectId: { not: null },
    },
    select: {
      projectId: true,
    },
  });

  const projectIds = shares.map(s => s.projectId).filter((id): id is string => id !== null);

  if (projectIds.length === 0) {
    return [];
  }

  return prisma.project.findMany({
    where: {
      id: { in: projectIds },
    },
    include: {
      documents: {
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
            select: {
              id: true,
              title: true,
              pageNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

