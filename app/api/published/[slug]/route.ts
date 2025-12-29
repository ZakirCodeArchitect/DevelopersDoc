import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/published/[slug]
 * Get a specific published document by slug (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    // Fetch published document by slug
    const document = await prisma.document.findFirst({
      where: {
        publishSlug: slug,
        isPublished: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        pages: {
          include: {
            sections: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Published document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: document.id,
      title: document.title,
      description: document.description,
      publishSlug: document.publishSlug,
      publishedAt: document.publishedAt,
      lastUpdated: document.lastUpdated,
      author: {
        id: document.user.id,
        name: `${document.user.firstName || ''} ${document.user.lastName || ''}`.trim() || document.user.email,
        email: document.user.email,
        imageUrl: document.user.imageUrl,
      },
      pages: document.pages.map((page) => ({
        id: page.id,
        title: page.title,
        pageNumber: page.pageNumber,
        sections: page.sections.map((section) => ({
          id: section.id,
          title: section.title,
          type: section.type,
          content: section.content,
          componentType: section.componentType,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching published document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

