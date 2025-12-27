import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { ProjectData } from '@/lib/docs';

// Helper function to read docs data fresh from file
async function readDocsData() {
  const filePath = path.join(process.cwd(), 'data', 'docs.json');
  const fileContents = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(fileContents);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;
    
    // Read fresh data from file
    const docsData = await readDocsData();

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Generate project ID from name
    const projectId = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if project with this ID already exists
    const existingProject = docsData.projects.find((p) => p.id === projectId);
    if (existingProject) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }

    // Create new project data
    const newProject = {
      id: projectId,
      label: name,
      title: name,
      description: description,
      lastUpdated: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      documents: [],
    } as ProjectData;

    // Add project to the data (cast to any to avoid type mismatch with JSON structure)
    (docsData.projects as any[]).push(newProject);

    // Write to file
    const filePath = path.join(process.cwd(), 'data', 'docs.json');
    await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      project: newProject,
      href: `/docs/projects/${projectId}`,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

