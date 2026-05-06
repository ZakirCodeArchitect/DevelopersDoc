import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { GENERATED_DOC_TITLE } from '@/lib/sync/doc-generation.service';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateSyncToken(): string {
  return randomBytes(32).toString('hex');
}

/** Owner or accepted project share — used for CLI sync UI + DocSyncProject lookup */
export async function findProjectIfUserHasAccess(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        {
          shares: {
            some: {
              sharedWith: userId,
              status: 'accepted',
            },
          },
        },
      ],
    },
    select: { id: true },
  });
}

export async function getSyncProjectForUser(projectId: string, userId: string) {
  const access = await findProjectIfUserHasAccess(projectId, userId);
  if (!access) {
    return null;
  }

  return prisma.docSyncProject.findUnique({
    where: { projectId },
  });
}

export async function createSyncProject(params: {
  projectId: string;
  userId: string;
  repoName: string;
  privacyMode?: string;
}) {
  const token = generateSyncToken();
  const syncTokenHash = hashToken(token);

  const syncProject = await prisma.docSyncProject.upsert({
    where: { projectId: params.projectId },
    update: {
      repoName: params.repoName,
      privacyMode: params.privacyMode || 'standard',
      syncTokenHash,
      status: 'active',
      userId: params.userId,
    },
    create: {
      projectId: params.projectId,
      userId: params.userId,
      repoName: params.repoName,
      privacyMode: params.privacyMode || 'standard',
      syncTokenHash,
      status: 'active',
    },
  });

  return { syncProject, token };
}

export async function validateSyncToken(syncProjectId: string, token: string) {
  const syncProject = await prisma.docSyncProject.findUnique({
    where: { id: syncProjectId },
  });

  if (!syncProject) {
    return null;
  }

  const incomingHash = Buffer.from(hashToken(token), 'utf8');
  const storedHash = Buffer.from(syncProject.syncTokenHash, 'utf8');
  if (incomingHash.length !== storedHash.length) {
    return null;
  }

  if (!timingSafeEqual(incomingHash, storedHash)) {
    return null;
  }

  return syncProject;
}

export async function storeInitialScan(params: {
  syncProjectId: string;
  commitSha: string;
  branch?: string;
  framework?: string;
  metadata: JsonValue;
}) {
  const snapshot = await prisma.docSyncSnapshot.create({
    data: {
      syncProjectId: params.syncProjectId,
      commitSha: params.commitSha,
      branch: params.branch || null,
      framework: params.framework || null,
      metadata: params.metadata,
    },
  });

  await prisma.docSyncProject.update({
    where: { id: params.syncProjectId },
    data: {
      lastSyncedCommit: params.commitSha,
      framework: params.framework || undefined,
      defaultBranch: params.branch || undefined,
      lastScanAt: new Date(),
    },
  });

  return snapshot;
}

export async function storeSyncChange(params: {
  syncProjectId: string;
  fromCommit?: string;
  toCommit: string;
  branch?: string;
  changedFiles: JsonValue;
  diffStat?: JsonValue;
  status?: string;
}) {
  const change = await prisma.docSyncChange.create({
    data: {
      syncProjectId: params.syncProjectId,
      fromCommit: params.fromCommit || null,
      toCommit: params.toCommit,
      branch: params.branch || null,
      changedFiles: params.changedFiles,
      diffStat: params.diffStat || null,
      status: params.status || 'received',
    },
  });

  await prisma.docSyncProject.update({
    where: { id: params.syncProjectId },
    data: {
      lastSyncedCommit: params.toCommit,
      defaultBranch: params.branch || undefined,
    },
  });

  return change;
}

export async function listRecentSyncChanges(projectId: string, userId: string) {
  const syncProject = await getSyncProjectForUser(projectId, userId);
  if (!syncProject) return [];

  return prisma.docSyncChange.findMany({
    where: { syncProjectId: syncProject.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export async function listProjectSyncStatus(projectId: string, userId: string) {
  const access = await findProjectIfUserHasAccess(projectId, userId);
  if (!access) {
    return {
      connected: false,
      syncProject: null,
      recentChangesCount: 0,
      pendingSuggestionsCount: 0,
      lastScanTime: null as Date | null,
      generatedDocumentation: null as
        | null
        | { generated: boolean; documentId: string | null; documentTitle: string | null },
    };
  }

  const syncProject = await prisma.docSyncProject.findUnique({
    where: { projectId },
  });

  if (!syncProject) {
    return {
      connected: false,
      syncProject: null,
      recentChangesCount: 0,
      pendingSuggestionsCount: 0,
      lastScanTime: null as Date | null,
      generatedDocumentation: null as
        | null
        | { generated: boolean; documentId: string | null; documentTitle: string | null },
    };
  }

  const [recentChangesCount, pendingSuggestionsCount, latestSnapshot, generatedDocSuggestion] =
    await Promise.all([
    prisma.docSyncChange.count({
      where: {
        syncProjectId: syncProject.id,
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
      },
    }),
    prisma.docAISuggestion.count({
      where: { projectId, status: 'pending' },
    }),
    prisma.docSyncSnapshot.findFirst({
      where: { syncProjectId: syncProject.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.docAISuggestion.findFirst({
      where: {
        projectId,
        suggestionType: 'initial_docs_generation',
        documentId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        documentId: true,
        document: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  let generatedDocId = generatedDocSuggestion?.documentId ?? null;
  let generatedDocTitle = generatedDocSuggestion?.document?.title ?? null;
  if (!generatedDocId) {
    const fallbackDoc = await prisma.document.findFirst({
      where: { projectId, title: GENERATED_DOC_TITLE },
      select: { id: true, title: true },
    });
    if (fallbackDoc) {
      generatedDocId = fallbackDoc.id;
      generatedDocTitle = fallbackDoc.title;
    }
  }

  return {
    connected: true,
    syncProject,
    recentChangesCount,
    pendingSuggestionsCount,
    lastScanTime: latestSnapshot?.createdAt || syncProject.lastScanAt,
    generatedDocumentation: {
      generated: Boolean(generatedDocId),
      documentId: generatedDocId,
      documentTitle: generatedDocTitle,
    },
  };
}
