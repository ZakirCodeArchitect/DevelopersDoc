import { NextRequest, NextResponse } from 'next/server';
import { updateProject, deleteProject } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';

export async function PATCH(
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update project (updateProject will verify ownership)
    const project = await updateProject(projectId, name, user.id);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error renaming project:', error);
    return NextResponse.json(
      { error: 'Failed to rename project' },
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

    // Delete project (deleteProject will verify ownership)
    await deleteProject(projectId, user.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

