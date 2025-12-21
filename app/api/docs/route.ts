import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import docsData from '@/data/docs.json';
import type { YourDocData, DocumentData } from '@/lib/docs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectId } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Generate document ID from name
    const docId = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // If projectId is provided, add document to the project
    if (projectId) {
      const project = docsData.projects.find((p) => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Check if document with this ID already exists in the project
      const existingDoc = project.documents?.find((d) => d.id === docId);
      if (existingDoc) {
        return NextResponse.json(
          { error: 'A document with this name already exists in this project' },
          { status: 409 }
        );
      }

      // Create new document data
      const newDoc = {
        id: docId,
        label: name,
        title: name,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        content: {
          sections: [
            {
              id: 'overview',
              title: 'Overview',
              type: 'text',
              content: [description],
            },
          ],
        },
      } as DocumentData;

      // Add document to the project
      if (!project.documents) {
        project.documents = [];
      }
      (project.documents as any[]).push(newDoc);

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      // Generate href for project document
      const href = `/docs/projects/${projectId}/${docId}`;

      return NextResponse.json({
        success: true,
        doc: newDoc,
        href,
      });
    } else {
      // Create document in "Your Docs"
      // Check if document with this ID already exists
      const existingDoc = docsData.yourDocs.find((d) => d.id === docId);
      if (existingDoc) {
        return NextResponse.json(
          { error: 'A document with this name already exists' },
          { status: 409 }
        );
      }

      // Create new document data
      const newDoc = {
        id: docId,
        label: name,
        title: name,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        content: {
          sections: [
            {
              id: 'overview',
              title: 'Overview',
              type: 'text',
              content: [description],
            },
          ],
        },
      } as YourDocData;

      // Add document to the data
      (docsData.yourDocs as any[]).push(newDoc);

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      // Generate href
      const href = `/docs/${docId}`;

      return NextResponse.json({
        success: true,
        doc: newDoc,
        href,
      });
    }
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

