import { NextRequest, NextResponse } from 'next/server';
import { storeInitialScan, validateSyncToken } from '@/lib/sync/sync.service';
import { prisma } from '@/lib/db';
import { generateInitialDocumentationForSyncProject } from '@/lib/sync/doc-generation.service';
import { Prisma } from '@prisma/client';

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
    const commitSha = body.commitSha as string | undefined;
    const branch = body.branch as string | undefined;
    const framework = body.framework as string | undefined;
    const metadata = body.metadata;

    if (!syncProjectId || !syncToken || !commitSha || !metadata) {
      return NextResponse.json(
        { error: 'syncProjectId, syncToken, commitSha, and metadata are required' },
        { status: 400 }
      );
    }

    if (hasObviousSecrets(metadata)) {
      return NextResponse.json(
        { error: 'Payload appears to include secrets and was rejected' },
        { status: 400 }
      );
    }

    const syncProject = await validateSyncToken(syncProjectId, syncToken);
    if (!syncProject) {
      return NextResponse.json({ error: 'Invalid sync credentials' }, { status: 401 });
    }

    const snapshotCountBeforeScan = await prisma.docSyncSnapshot.count({
      where: { syncProjectId: syncProject.id },
    });

    await storeInitialScan({
      syncProjectId: syncProject.id,
      commitSha,
      branch,
      framework,
      metadata,
    });

    if (snapshotCountBeforeScan === 0) {
      try {
        await generateInitialDocumentationForSyncProject(syncProject.id);
      } catch (generationError) {
        console.error('Initial docs generation failed after first scan:', generationError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing CLI scan:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2024' || error.code === 'P1017') {
        return NextResponse.json(
          { error: 'Database temporarily unavailable. Please retry in a moment.' },
          { status: 503 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to store scan' },
      { status: 500 }
    );
  }
}
