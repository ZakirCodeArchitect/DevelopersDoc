import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { YourDocData, DocumentData } from '@/lib/docs';

// Helper function to read docs data fresh from file
async function readDocsData() {
  const filePath = path.join(process.cwd(), 'data', 'docs.json');
  const fileContents = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(fileContents);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectId } = body;
    
    // Read fresh data from file
    const docsData = await readDocsData();

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

      // Create new document data with pages format
      const newDoc = {
        id: docId,
        label: name,
        title: name,
        description: description,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        content: {
          pages: [
            {
              id: 'untitled-page',
              title: 'Untitled page',
              sections: [
                {
                  id: 'untitled-page-content',
                  title: '',
                  type: 'html',
                  content: ['<p></p>'],
                },
              ],
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

      // Generate href for project document's first page
      const href = `/docs/projects/${projectId}/${docId}/untitled-page`;

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

      // Create new document data with pages format
      const newDoc = {
        id: docId,
        label: name,
        title: name,
        description: description,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        content: {
          pages: [
            {
              id: 'untitled-page',
              title: 'Untitled page',
              sections: [
                {
                  id: 'untitled-page-content',
                  title: '',
                  type: 'html',
                  content: ['<p></p>'],
                },
              ],
            },
          ],
        },
      } as YourDocData;

      // Add document to the data
      (docsData.yourDocs as any[]).push(newDoc);

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      // Generate href to first page
      const href = `/docs/${docId}/untitled-page`;

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

