import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/published
 * Get all published documents (public endpoint, but requires authentication)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    // Fetch published documents
    const where = {
      isPublished: true,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
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
            select: {
              id: true,
              title: true,
              pageNumber: true,
            },
            orderBy: { pageNumber: 'asc' },
            take: 1, // Just get first page for preview
          },
          _count: {
            select: {
              pages: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        publishSlug: doc.publishSlug,
        publishedAt: doc.publishedAt,
        lastUpdated: doc.lastUpdated,
        author: {
          id: doc.user.id,
          name: `${doc.user.firstName || ''} ${doc.user.lastName || ''}`.trim() || doc.user.email,
          email: doc.user.email,
          imageUrl: doc.user.imageUrl,
        },
        pageCount: doc._count.pages,
        firstPage: doc.pages[0] ? {
          id: doc.pages[0].id,
          title: doc.pages[0].title,
        } : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching published documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

