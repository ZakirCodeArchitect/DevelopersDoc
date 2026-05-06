import { NextRequest, NextResponse } from 'next/server';
import { storeInitialScan, validateSyncToken } from '@/lib/sync/sync.service';
import { generateInitialDocumentationForSyncProject } from '@/lib/sync/doc-generation.service';
import { revalidateDocsNavData } from '@/lib/revalidate-docs-cache';
import { Prisma } from '@prisma/client';

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

function frameworkFromScanPayload(metadata: unknown, bodyFramework: string | undefined): string | undefined {
  if (typeof bodyFramework === 'string' && bodyFramework.trim()) return bodyFramework.trim();
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
  const fw = (metadata as Record<string, unknown>).framework;
  return typeof fw === 'string' && fw.trim() ? fw.trim() : undefined;
}

function hasObviousSecrets(value: unknown): boolean {
  const suspectPatterns = [
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/i,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-[a-zA-Z0-9-]{10,}/,
    /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{8,}["']/i,
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
    const framework = frameworkFromScanPayload(body.metadata, body.framework as string | undefined);
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

    await storeInitialScan({
      syncProjectId: syncProject.id,
      commitSha,
      branch,
      framework,
      metadata,
    });

    /**
     * Run after every scan: generateInitialDocumentationForSyncProject skips work when a generated
     * doc already exists. Previously we only ran this on the first snapshot — if that run failed,
     * later scans never retried, leaving 0 documents until manual action.
     */
    try {
      await generateInitialDocumentationForSyncProject(syncProject.id);
    } catch (generationError) {
      console.error('Initial docs generation failed after scan:', generationError);
    }

    /** Refresh sidebar/nav cache even when initial doc generation skips (e.g. already generated). */
    revalidateDocsNavData();

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
