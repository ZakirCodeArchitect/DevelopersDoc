import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/users';
import { prisma } from '@/lib/db';
import { createSyncProject } from '@/lib/sync/sync.service';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, repoName, privacyMode } = body;

    if (!projectId || !repoName) {
      return NextResponse.json(
        { error: 'projectId and repoName are required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { syncProject, token } = await createSyncProject({
      projectId,
      userId: user.id,
      repoName,
      privacyMode,
    });

    return NextResponse.json({
      success: true,
      syncProjectId: syncProject.id,
      projectId: syncProject.projectId,
      syncToken: token,
    });
  } catch (error) {
    console.error('Error registering CLI sync project:', error);
    return NextResponse.json(
      { error: 'Failed to register sync project' },
      { status: 500 }
    );
  }
}
