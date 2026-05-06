import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/users';
import {
  findProjectIfUserHasAccess,
  listProjectSyncStatus,
  listRecentSyncChanges,
} from '@/lib/sync/sync.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const projectAccess = await findProjectIfUserHasAccess(projectId, user.id);
    if (!projectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [status, recentChanges] = await Promise.all([
      listProjectSyncStatus(projectId, user.id),
      listRecentSyncChanges(projectId, user.id),
    ]);

    return NextResponse.json({
      success: true,
      connected: status.connected,
      syncProject: status.syncProject
        ? {
            id: status.syncProject.id,
            repoName: status.syncProject.repoName,
            framework: status.syncProject.framework,
            privacyMode: status.syncProject.privacyMode,
            lastSyncedCommit: status.syncProject.lastSyncedCommit,
          }
        : null,
      lastScanTime: status.lastScanTime,
      recentChangesCount: status.recentChangesCount,
      pendingSuggestionsCount: status.pendingSuggestionsCount,
      generatedDocumentation: status.generatedDocumentation,
      recentChanges: recentChanges.map((change) => ({
        id: change.id,
        fromCommit: change.fromCommit,
        toCommit: change.toCommit,
        branch: change.branch,
        status: change.status,
        changedFiles: change.changedFiles,
        createdAt: change.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting project sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
