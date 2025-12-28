import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/db';
import { getCurrentUser } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create new project (createProject handles unique ID generation)
    const newProject = await createProject(name, description, user.id);

    return NextResponse.json({
      success: true,
      project: newProject,
      href: `/docs/projects/${newProject.id}`,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

