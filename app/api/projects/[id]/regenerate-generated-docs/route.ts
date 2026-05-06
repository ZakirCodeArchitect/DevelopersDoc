import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/users';
import { regenerateGeneratedDocumentationFromLatestSnapshot } from '@/lib/sync/doc-generation.service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const result = await regenerateGeneratedDocumentationFromLatestSnapshot(projectId, user.id);

    if (!result.ok) {
      const status =
        result.reason === 'forbidden'
          ? 403
          : result.reason === 'no-sync' || result.reason === 'no-snapshot' || result.reason === 'no-generated-doc'
            ? 400
            : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
    });
  } catch (error) {
    console.error('regenerate-generated-docs:', error);
    return NextResponse.json({ error: 'Failed to regenerate documentation' }, { status: 500 });
  }
}
