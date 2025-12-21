import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import docsData from '@/data/docs.json';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const project = docsData.projects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project name
    project.label = name;
    project.title = name;

    // Write to file
    const filePath = path.join(process.cwd(), 'data', 'docs.json');
    await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

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
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    const projectIndex = docsData.projects.findIndex((p) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Remove project
    docsData.projects.splice(projectIndex, 1);

    // Write to file
    const filePath = path.join(process.cwd(), 'data', 'docs.json');
    await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

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

