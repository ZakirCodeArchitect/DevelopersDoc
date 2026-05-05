import { NextRequest, NextResponse } from 'next/server';
import { storeSyncChange, validateSyncToken } from '@/lib/sync/sync.service';

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

function hasObviousSecrets(value: unknown): boolean {
  const suspectPatterns = [
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/i,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-[a-zA-Z0-9-]{10,}/,
    /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{6,}["']/i,
    /\.env/i,
  ];

  const serialized = JSON.stringify(value || {});
  return suspectPatterns.some((pattern) => pattern.test(serialized));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const syncProjectId = body.syncProjectId as string | undefined;
    const syncToken = (body.syncToken as string | undefined) || extractBearerToken(request);
    const fromCommit = body.fromCommit as string | undefined;
    const toCommit = body.toCommit as string | undefined;
    const branch = body.branch as string | undefined;
    const changedFiles = body.changedFiles;
    const diffStat = body.diffStat;

    if (!syncProjectId || !syncToken || !toCommit || !changedFiles) {
      return NextResponse.json(
        { error: 'syncProjectId, syncToken, toCommit, and changedFiles are required' },
        { status: 400 }
      );
    }

    if (hasObviousSecrets(changedFiles)) {
      return NextResponse.json(
        { error: 'Payload appears to include secrets and was rejected' },
        { status: 400 }
      );
    }

    const syncProject = await validateSyncToken(syncProjectId, syncToken);
    if (!syncProject) {
      return NextResponse.json({ error: 'Invalid sync credentials' }, { status: 401 });
    }

    await storeSyncChange({
      syncProjectId: syncProject.id,
      fromCommit,
      toCommit,
      branch,
      changedFiles,
      diffStat,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing CLI changes:', error);
    return NextResponse.json(
      { error: 'Failed to store changes' },
      { status: 500 }
    );
  }
}
