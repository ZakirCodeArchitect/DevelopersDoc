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
    const docId = resolvedParams.id;
    const body = await request.json();
    const { name, projectId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // If projectId is provided, update document in project
    if (projectId) {
      const project = docsData.projects.find((p) => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const doc = project.documents?.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Generate new document ID from name
      const newDocId = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if new ID conflicts with existing document
      if (newDocId !== docId && project.documents?.some((d) => d.id === newDocId)) {
        return NextResponse.json(
          { error: 'A document with this name already exists in this project' },
          { status: 409 }
        );
      }

      // Update document
      doc.id = newDocId;
      doc.label = name;
      doc.title = name;

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        doc,
        newHref: `/docs/projects/${projectId}/${newDocId}`,
      });
    } else {
      // Update document in "Your Docs"
      const doc = docsData.yourDocs.find((d) => d.id === docId);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Generate new document ID from name
      const newDocId = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if new ID conflicts with existing document
      if (newDocId !== docId && docsData.yourDocs.some((d) => d.id === newDocId)) {
        return NextResponse.json(
          { error: 'A document with this name already exists' },
          { status: 409 }
        );
      }

      // Update document
      doc.id = newDocId;
      doc.label = name;
      doc.title = name;

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        doc,
        newHref: `/docs/${newDocId}`,
      });
    }
  } catch (error) {
    console.error('Error renaming document:', error);
    return NextResponse.json(
      { error: 'Failed to rename document' },
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
    const docId = resolvedParams.id;
    const body = await request.json();
    const { projectId } = body;

    // If projectId is provided, delete document from project
    if (projectId) {
      const project = docsData.projects.find((p) => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const docIndex = project.documents?.findIndex((d) => d.id === docId) ?? -1;
      if (docIndex === -1) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Remove document from project
      project.documents?.splice(docIndex, 1);

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
      });
    } else {
      // Delete document from "Your Docs"
      const docIndex = docsData.yourDocs.findIndex((d) => d.id === docId);
      if (docIndex === -1) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Remove document
      docsData.yourDocs.splice(docIndex, 1);

      // Write to file
      const filePath = path.join(process.cwd(), 'data', 'docs.json');
      await fs.writeFile(filePath, JSON.stringify(docsData, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

